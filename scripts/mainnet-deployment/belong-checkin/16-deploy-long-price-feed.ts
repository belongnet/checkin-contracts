import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import { verifyContract } from '../../../helpers/verify';
import { LONGPriceFeed } from '../../../typechain-types';

import fs from 'fs';

dotenv.config();

const ENV_DEPLOY = process.env.DEPLOY?.toLowerCase() === 'true';
const ENV_VERIFY = process.env.VERIFY?.toLowerCase() === 'true';
const DEPLOY = ENV_DEPLOY ?? true;
const VERIFY = ENV_VERIFY ?? true;

async function deploy() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentsDir = 'deployments';
  const deploymentFile = `${deploymentsDir}/chainId-${chainId}.json`;

  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  let deployments: any = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }

  deployments.tokens = deployments.tokens || {};

  if (DEPLOY) {
    console.log('Deploy LONGPriceFeed: ');

    const owner = process.env.LONG_PRICE_FEED_OWNER ?? process.env.ADMIN_ADDRESS;
    const decimalsEnv = process.env.LONG_PRICE_FEED_DECIMALS ?? '8';
    const description = process.env.LONG_PRICE_FEED_DESCRIPTION ?? 'LONG / USD';
    const initialAnswerEnv = process.env.LONG_PRICE_FEED_INITIAL_ANSWER ?? '100000000';

    if (!owner) {
      throw new Error(`Missing required environment variable:\nLONG_PRICE_FEED_OWNER or ADMIN_ADDRESS`);
    }

    if (!ethers.utils.isAddress(owner)) {
      throw new Error(`Invalid address: ${owner}`);
    }

    const decimals = Number(decimalsEnv);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
      throw new Error(`Invalid LONG_PRICE_FEED_DECIMALS: ${decimalsEnv}`);
    }

    const initialAnswer = ethers.BigNumber.from(initialAnswerEnv);
    if (initialAnswer.lte(0)) {
      throw new Error(`Invalid LONG_PRICE_FEED_INITIAL_ANSWER: ${initialAnswerEnv}`);
    }

    const LONGPriceFeedFactory = await ethers.getContractFactory('LONGPriceFeed');
    const longPriceFeed: LONGPriceFeed = (await LONGPriceFeedFactory.deploy(
      owner,
      decimals,
      description,
      initialAnswer,
    )) as LONGPriceFeed;
    await longPriceFeed.deployed();

    deployments.tokens.longPriceFeed = longPriceFeed.address;
    deployments.tokens.longPriceFeedMeta = {
      decimals,
      description,
      initialAnswer: initialAnswer.toString(),
    };

    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed LONGPriceFeed to: ', longPriceFeed.address);
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    try {
      const owner = process.env.LONG_PRICE_FEED_OWNER ?? process.env.ADMIN_ADDRESS;
      const meta = deployments.tokens.longPriceFeedMeta ?? {};
      const decimals = meta.decimals ?? Number(process.env.LONG_PRICE_FEED_DECIMALS ?? '8');
      const description = meta.description ?? process.env.LONG_PRICE_FEED_DESCRIPTION ?? 'LONG / USD';
      const initialAnswer = meta.initialAnswer ?? process.env.LONG_PRICE_FEED_INITIAL_ANSWER ?? '100000000';

      if (!deployments.tokens.longPriceFeed) {
        throw new Error('No LONGPriceFeed deployment data found for verification.');
      }
      if (!owner) {
        throw new Error('Missing LONG_PRICE_FEED_OWNER or ADMIN_ADDRESS for verification.');
      }

      await verifyContract(deployments.tokens.longPriceFeed, [owner, decimals, description, initialAnswer]);
      console.log('LONGPriceFeed verification successful.');
    } catch (error) {
      console.error('LONGPriceFeed verification failed: ', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed: ', error);
  process.exit(1);
});
