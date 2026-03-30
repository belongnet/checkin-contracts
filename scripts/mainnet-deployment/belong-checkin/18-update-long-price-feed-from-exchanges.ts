import dotenv from 'dotenv';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

import { LONGPriceFeed } from '../../../typechain-types';
import {
  buildConsensus,
  deviationBps,
  fetchExchangePrices,
  formatUnits,
  parseSourceList,
  shouldPublishUpdate,
} from './exchange-long-price-feed';
import { logSafeTransaction } from './safe-tx';

import fs from 'fs';

dotenv.config();

async function updateLongPriceFeedFromExchanges() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentFile = `deployments/chainId-${chainId}.json`;

  let deployments: any = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }
  deployments.tokens = deployments.tokens || {};

  const priceFeedAddress = process.env.LONG_PRICE_FEED ?? deployments.tokens.longPriceFeed;
  if (!priceFeedAddress) {
    throw new Error('Missing LONG_PRICE_FEED and deployments.tokens.longPriceFeed');
  }
  if (!ethers.utils.isAddress(priceFeedAddress)) {
    throw new Error(`Invalid LONG price feed address: ${priceFeedAddress}`);
  }

  const longPriceFeed = (await ethers.getContractAt('LONGPriceFeed', priceFeedAddress)) as LONGPriceFeed;
  const decimals = await longPriceFeed.decimals();
  const owner = await longPriceFeed.owner();
  const [signer] = await ethers.getSigners();
  const dryRun = process.env.DRY_RUN?.toLowerCase() === 'true';
  const ownerCode = await ethers.provider.getCode(owner);
  const ownerIsContract = ownerCode !== '0x';

  if (!dryRun && !ownerIsContract && owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Signer ${signer.address} is not LONGPriceFeed owner ${owner}`);
  }

  const sources = parseSourceList(process.env.LONG_PRICE_FEED_SOURCES);
  const minSources = Number(process.env.LONG_PRICE_FEED_MIN_SOURCES ?? '3');
  const maxSourceDeviationBps = BigInt(process.env.LONG_PRICE_FEED_MAX_SOURCE_DEVIATION_BPS ?? '300');
  const updateThresholdBps = BigInt(process.env.LONG_PRICE_FEED_UPDATE_THRESHOLD_BPS ?? '100');
  const heartbeatSeconds = Number(process.env.LONG_PRICE_FEED_HEARTBEAT_SECONDS ?? '900');
  const maxUpdateBpsEnv = process.env.LONG_PRICE_FEED_MAX_UPDATE_BPS;

  if (!Number.isInteger(minSources) || minSources <= 0 || minSources > sources.length) {
    throw new Error(`Invalid LONG_PRICE_FEED_MIN_SOURCES: ${String(minSources)}`);
  }
  if (!Number.isInteger(heartbeatSeconds) || heartbeatSeconds <= 0) {
    throw new Error(`Invalid LONG_PRICE_FEED_HEARTBEAT_SECONDS: ${String(heartbeatSeconds)}`);
  }

  const { observations, rejections } = await fetchExchangePrices({
    decimals,
    sources,
    binanceAlphaChainId: process.env.LONG_PRICE_FEED_BINANCE_ALPHA_CHAIN_ID ?? String(chainId),
    binanceAlphaContract: process.env.LONG_PRICE_FEED_BINANCE_ALPHA_CONTRACT ?? deployments.tokens.long,
    gatePair: process.env.LONG_PRICE_FEED_GATE_PAIR ?? 'LONG_USDT',
    mexcSymbol: process.env.LONG_PRICE_FEED_MEXC_SYMBOL ?? 'LONGUSDT',
  });

  if (observations.length < minSources) {
    throw new Error(
      `Only ${observations.length} exchange prices were available; required at least ${minSources}. Rejections: ${JSON.stringify(rejections)}`,
    );
  }

  const consensus = buildConsensus(observations, maxSourceDeviationBps, minSources);
  const allRejections = [...rejections, ...consensus.rejected];

  let currentAnswer: bigint | undefined;
  let currentUpdatedAt: number | undefined;
  try {
    const latestRoundData = await longPriceFeed.latestRoundData();
    currentAnswer = BigInt(latestRoundData[1].toString());
    currentUpdatedAt = Number(latestRoundData[3].toString());
  } catch {
    currentAnswer = undefined;
    currentUpdatedAt = undefined;
  }

  const updateDecision = shouldPublishUpdate({
    currentAnswer,
    currentUpdatedAt,
    nextAnswer: consensus.median,
    thresholdBps: updateThresholdBps,
    heartbeatSeconds,
  });

  if (currentAnswer && maxUpdateBpsEnv) {
    const maxUpdateBps = BigInt(maxUpdateBpsEnv);
    const moveBps = deviationBps(consensus.median, currentAnswer);
    if (moveBps > maxUpdateBps) {
      throw new Error(
        `Proposed LONG price moved ${moveBps.toString()} bps which exceeds LONG_PRICE_FEED_MAX_UPDATE_BPS=${maxUpdateBps.toString()}`,
      );
    }
  }

  console.log(`LONGPriceFeed: ${priceFeedAddress}`);
  console.log(
    `Consensus price: ${formatUnits(consensus.median, decimals)} (${consensus.median.toString()} @ 1e${decimals})`,
  );
  console.log(
    `Accepted sources: ${consensus.accepted
      .map(observation => `${observation.source}=${formatUnits(observation.price, decimals)}`)
      .join(', ')}`,
  );
  if (allRejections.length > 0) {
    console.log(`Rejected sources: ${allRejections.map(rejection => `${rejection.source}:${rejection.reason}`).join(', ')}`);
  }

  if (currentAnswer && currentUpdatedAt) {
    console.log(
      `Current on-chain price: ${formatUnits(currentAnswer, decimals)} (${currentAnswer.toString()}); updatedAt=${currentUpdatedAt}`,
    );
  } else {
    console.log('Current on-chain price: no round present yet');
  }

  console.log(
    `Decision: ${updateDecision.reason} (shouldUpdate=${String(updateDecision.shouldUpdate)}, deviationBps=${updateDecision.deviationBps?.toString() ?? 'n/a'}, ageSeconds=${updateDecision.ageSeconds ?? 'n/a'})`,
  );

  if (!updateDecision.shouldUpdate) {
    console.log('Skipping on-chain update.');
    return;
  }

  const nextAnswer = BigNumber.from(consensus.median.toString());
  const txRequest = await longPriceFeed.populateTransaction.updateAnswer(nextAnswer);
  if (!txRequest.data) {
    throw new Error('Failed to build calldata for LONGPriceFeed.updateAnswer');
  }

  if (ownerIsContract) {
    console.log(`LONGPriceFeed owner is a contract: ${owner}`);
    if (dryRun) {
      console.log('Dry run enabled; not executing on-chain update.');
    }
    logSafeTransaction(priceFeedAddress, txRequest.data);
    return;
  }

  if (dryRun) {
    console.log('Dry run enabled; skipping on-chain update.');
    return;
  }

  const tx = await longPriceFeed.updateAnswer(nextAnswer);
  const receipt = await tx.wait();
  console.log(`LONGPriceFeed updated in tx ${receipt.transactionHash}`);
}

updateLongPriceFeedFromExchanges().catch(error => {
  console.error('Exchange-backed LONG price feed update failed:', error);
  process.exit(1);
});
