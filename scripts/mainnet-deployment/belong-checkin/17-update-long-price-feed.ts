import dotenv from 'dotenv';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

import { LONGPriceFeed } from '../../../typechain-types';
import { logSafeTransaction } from './safe-tx';

import fs from 'fs';

dotenv.config();

async function updateLongPriceFeed() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentFile = `deployments/chainId-${chainId}.json`;

  let deployments: any = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }
  deployments.tokens = deployments.tokens || {};

  const priceFeedAddress = process.env.LONG_PRICE_FEED ?? deployments.tokens.longPriceFeed;
  const answerEnv = process.env.LONG_PRICE_FEED_ANSWER;

  if (!priceFeedAddress || !answerEnv) {
    throw new Error(
      `Missing required environment variables:\nLONG_PRICE_FEED: ${priceFeedAddress}\nLONG_PRICE_FEED_ANSWER: ${answerEnv}`,
    );
  }

  if (!ethers.utils.isAddress(priceFeedAddress)) {
    throw new Error(`Invalid LONG price feed address: ${priceFeedAddress}`);
  }

  const answer = BigNumber.from(answerEnv);
  if (answer.lte(0)) {
    throw new Error(`Invalid LONG_PRICE_FEED_ANSWER: ${answerEnv}`);
  }

  const longPriceFeed = (await ethers.getContractAt('LONGPriceFeed', priceFeedAddress)) as LONGPriceFeed;
  const [signer] = await ethers.getSigners();
  const owner = await longPriceFeed.owner();
  const ownerCode = await ethers.provider.getCode(owner);

  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    if (ownerCode !== '0x') {
      const txRequest = await longPriceFeed.populateTransaction.updateAnswer(answer);
      if (!txRequest.data) {
        throw new Error('Failed to build calldata for LONGPriceFeed.updateAnswer');
      }

      console.log(`LONGPriceFeed owner is a contract: ${owner}`);
      logSafeTransaction(priceFeedAddress, txRequest.data);
      return;
    }

    throw new Error(`Signer ${signer.address} is not LONGPriceFeed owner ${owner}`);
  }

  console.log(`Updating LONGPriceFeed ${priceFeedAddress} to answer ${answer.toString()}...`);
  const tx = await longPriceFeed.updateAnswer(answer);
  const receipt = await tx.wait();
  console.log(`LONGPriceFeed updated in tx ${receipt.transactionHash}`);

  const latestRoundData = await longPriceFeed.latestRoundData();
  console.log(
    `Latest round ${latestRoundData[0].toString()} answer=${latestRoundData[1].toString()} updatedAt=${latestRoundData[3].toString()}`,
  );
}

updateLongPriceFeed().catch(error => {
  console.error('LONG price feed update failed:', error);
  process.exit(1);
});
