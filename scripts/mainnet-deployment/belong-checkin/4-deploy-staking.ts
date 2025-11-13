import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import { deployStaking } from '../../../helpers/deployFixtures';
import { verifyContract } from '../../../helpers/verify';
import { Staking } from '../../../typechain-types';

import fs from 'fs';

dotenv.config();

const ENV_DEPLOY = process.env.DEPLOY?.toLowerCase() === 'true';
const ENV_VERIFY = process.env.VERIFY?.toLowerCase() === 'true';
const DEPLOY = ENV_DEPLOY ?? true; // <-- ENV_UPGRADE is `false` (not nullish), so UPGRADE=false
const VERIFY = ENV_VERIFY ?? true; // same

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

  if (!deployments.tokens) {
    deployments.tokens = {};
  }

  if (DEPLOY) {
    console.log('Deploy Staking: ');

    // Read addresses from environment variables
    const owner = process.env.ADMIN_ADDRESS;
    const treasury = process.env.TREASURY_ADDRESS;

    // Validate environment variables
    if (!owner || !treasury || !deployments.tokens.long) {
      throw new Error(
        `Missing required environment variables:\nADMIN_ADDRESS: ${process.env.ADMIN_ADDRESS}\nTREASURY_ADDRESS: ${process.env.TREASURY_ADDRESS}\nLong: ${deployments.tokens.long}`,
      );
    }

    // Validate addresses
    for (const addr of [owner, treasury, deployments.tokens.long]) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }

    console.log('Deploying Staking contract...');
    const staking: Staking = await deployStaking(owner, treasury, deployments.tokens.long);

    // Update deployments object
    deployments.tokens.staking = staking.address;
    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed Staking to: ', staking.address);
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    try {
      if (!deployments.tokens.staking) {
        throw new Error('No Staking deployment data found for verification.');
      }
      await verifyContract(deployments.tokens.staking);
      console.log('Staking verification successful.');
    } catch (error) {
      console.error('Staking verification failed: ', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed: ', error);
  process.exit(1);
});
