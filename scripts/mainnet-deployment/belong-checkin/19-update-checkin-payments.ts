import dotenv from 'dotenv';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

import { BelongCheckIn } from '../../../typechain-types';
import { DualDexSwapV4Lib } from '../../../typechain-types/contracts/v2/platform/extensions/DualDexSwapV4';
import { logSafeTransaction } from './safe-tx';

import fs from 'fs';

dotenv.config();

const BPS_27 = ethers.utils.parseUnits('1', 27);
const DEFAULT_CHECKIN_SLIPPAGE_BPS = 100;
const DEFAULT_MAX_PRICE_FEED_DELAY = 3600;

function parseCheckInSlippageBps(rawValue: string | undefined): BigNumber {
  const slippageBps = Number(rawValue ?? DEFAULT_CHECKIN_SLIPPAGE_BPS);
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 10_000) {
    throw new Error(`Invalid CHECKIN_SLIPPAGE_BPS: ${String(rawValue ?? DEFAULT_CHECKIN_SLIPPAGE_BPS)}`);
  }

  return BPS_27.mul(slippageBps).div(10_000);
}

function parseMaxPriceFeedDelay(rawValue: string | undefined): number {
  const maxPriceFeedDelay = Number(rawValue ?? DEFAULT_MAX_PRICE_FEED_DELAY);
  if (!Number.isInteger(maxPriceFeedDelay) || maxPriceFeedDelay <= 0) {
    throw new Error(
      `Invalid CHECKIN_MAX_PRICE_FEED_DELAY: ${String(rawValue ?? DEFAULT_MAX_PRICE_FEED_DELAY)}`,
    );
  }

  return maxPriceFeedDelay;
}

function normalizePaymentsInfo(info: DualDexSwapV4Lib.PaymentsInfoStructOutput) {
  return {
    dexType: Number(info.dexType),
    slippageBps: info.slippageBps.toString(),
    router: info.router.toLowerCase(),
    usdToken: info.usdToken.toLowerCase(),
    long: info.long.toLowerCase(),
    maxPriceFeedDelay: Number(info.maxPriceFeedDelay),
    poolKey: info.poolKey,
    hookData: info.hookData,
  };
}

async function updateCheckInPayments() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentFile = `deployments/chainId-${chainId}.json`;

  let deployments: any = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }
  deployments.checkIn = deployments.checkIn || {};

  const checkInAddress = process.env.CHECKIN_ADDRESS ?? deployments.checkIn.address;
  if (!checkInAddress) {
    throw new Error('Missing CHECKIN_ADDRESS and deployments.checkIn.address');
  }
  if (!ethers.utils.isAddress(checkInAddress)) {
    throw new Error(`Invalid BelongCheckIn address: ${checkInAddress}`);
  }

  const belongCheckIn = (await ethers.getContractAt('BelongCheckIn', checkInAddress)) as BelongCheckIn;
  const currentPaymentsInfo = await belongCheckIn.paymentsInfo();
  const currentConfig = normalizePaymentsInfo(currentPaymentsInfo);

  const nextPaymentsInfo: DualDexSwapV4Lib.PaymentsInfoStruct = {
    dexType: currentPaymentsInfo.dexType,
    slippageBps: parseCheckInSlippageBps(process.env.CHECKIN_SLIPPAGE_BPS),
    router: currentPaymentsInfo.router,
    usdToken: currentPaymentsInfo.usdToken,
    long: currentPaymentsInfo.long,
    maxPriceFeedDelay: parseMaxPriceFeedDelay(process.env.CHECKIN_MAX_PRICE_FEED_DELAY),
    poolKey: currentPaymentsInfo.poolKey,
    hookData: currentPaymentsInfo.hookData,
  };
  const nextConfig = normalizePaymentsInfo(nextPaymentsInfo as DualDexSwapV4Lib.PaymentsInfoStructOutput);

  console.log(`BelongCheckIn: ${checkInAddress}`);
  console.log(
    `Current payments config: slippageBps=${currentConfig.slippageBps} maxPriceFeedDelay=${currentConfig.maxPriceFeedDelay}`,
  );
  console.log(
    `Next payments config: slippageBps=${nextConfig.slippageBps} maxPriceFeedDelay=${nextConfig.maxPriceFeedDelay}`,
  );

  if (JSON.stringify(currentConfig) === JSON.stringify(nextConfig)) {
    console.log('Payments config already matches requested values; nothing to update.');
    return;
  }

  const owner = await belongCheckIn.owner();
  const [signer] = await ethers.getSigners();
  const ownerCode = await ethers.provider.getCode(owner);
  const txRequest = await belongCheckIn.populateTransaction.setPaymentsInfo(nextPaymentsInfo);

  if (!txRequest.data) {
    throw new Error('Failed to build calldata for setPaymentsInfo');
  }

  console.log(`Owner: ${owner}`);

  if (owner.toLowerCase() === signer.address.toLowerCase()) {
    console.log(`Sending setPaymentsInfo() from owner signer ${signer.address}...`);
    const tx = await belongCheckIn.setPaymentsInfo(nextPaymentsInfo);
    const receipt = await tx.wait();
    console.log(`BelongCheckIn payments config updated in tx ${receipt.transactionHash}`);

    deployments.checkIn.paymentsInfo = nextPaymentsInfo;
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    return;
  }

  if (ownerCode !== '0x') {
    console.log('Owner is a contract. Submit the following transaction via Safe or the owner contract:');
    logSafeTransaction(checkInAddress, txRequest.data);
    return;
  }

  throw new Error(`Signer ${signer.address} is not BelongCheckIn owner ${owner}`);
}

updateCheckInPayments().catch(error => {
  console.error('BelongCheckIn payments config update failed:', error);
  process.exit(1);
});
