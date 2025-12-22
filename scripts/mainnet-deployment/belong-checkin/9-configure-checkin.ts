import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import { BelongCheckIn } from '../../../typechain-types';

import fs from 'fs';

dotenv.config();

async function deploy() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentsDir = 'deployments';
  const deploymentFile = `${deploymentsDir}/chainId-${chainId}.json`;

  // Ensure deployments directory exists
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Initialize deployments object
  let deployments: any = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }

  console.log('Set BelongCheckIn up: ');

  const longPF = process.env.LONG_PRICE_FEED;

  // Validate environment variables
  if (
    !deployments.checkIn.address ||
    !deployments.factory.proxy ||
    !deployments.checkIn.escrow ||
    !deployments.tokens.staking ||
    !deployments.tokens.venueToken.address ||
    !deployments.tokens.promoterToken.address ||
    !deployments.tokens.longPriceFeed
  ) {
    throw new Error(
      `Missing required environment variables:\nBelongCheckIn: ${deployments.checkIn.address}\nFactory: ${deployments.factory.proxy}\nEscrow: ${deployments.checkIn.escrow}\nStaking: ${deployments.tokens.staking}\nVenueToken: ${deployments.tokens.venueToken.address}\nPromoterToken: ${deployments.tokens.promoterToken.address}\LONG_PRICE_FEED: ${longPF}\n`,
    );
  }

  // Validate addresses (exclude swapPoolFees as it's not an address)
  for (const addr of [
    deployments.checkIn.address,
    deployments.factory.proxy,
    deployments.checkIn.escrow,
    deployments.tokens.staking,
    deployments.tokens.venueToken.address,
    deployments.tokens.promoterToken.address,
    longPF,
  ]) {
    if (!ethers.utils.isAddress(addr)) {
      throw new Error(`Invalid address: ${addr}`);
    }
  }

  const belongCheckIn: BelongCheckIn = await ethers.getContractAt('BelongCheckIn', deployments.checkIn.address);

  const contracts = {
    factory: deployments.factory.proxy,
    escrow: deployments.checkIn.escrow,
    staking: deployments.tokens.staking,
    venueToken: deployments.tokens.venueToken.address,
    promoterToken: deployments.tokens.promoterToken.address,
    longPF,
  };

  console.log('Setting BelongCheckIn up...');
  await belongCheckIn.setContracts(contracts);

  console.log('Done.');
}

deploy().catch(error => {
  console.error('Script failed: ', error);
  process.exit(1);
});
