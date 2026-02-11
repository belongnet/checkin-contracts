import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import { deployLONG } from '../../../helpers/deployFixtures';
import { verifyContract } from '../../../helpers/verify';
import { LONG } from '../../../typechain-types';

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
    console.log('Deploy LONG: ');
    // Read addresses from environment variables
    const mintToAddress = process.env.MINT_LONG_TO;
    const adminAddress = process.env.ADMIN_ADDRESS;
    const pauserAddress = process.env.PAUSER_ADDRESS;

    // Validate environment variables
    if (!mintToAddress || !adminAddress || !pauserAddress) {
      throw new Error(
        `Missing required environment variables:\nMINT_LONG_TO: ${mintToAddress}\nADMIN_ADDRESS: ${adminAddress}\nPAUSER_ADDRESS: ${pauserAddress}`,
      );
    }

    // Validate addresses
    for (const addr of [mintToAddress, adminAddress, pauserAddress]) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }
    console.log('Deploying LONG contract...');
    const long: LONG = await deployLONG(mintToAddress, adminAddress, pauserAddress);

    // Update deployments object
    deployments.tokens.long = long.address;
    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed LONG to: ', long.address);

    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    try {
      if (!deployments.tokens.long) {
        throw new Error('No LONG deployment data found for verification.');
      }
      await verifyContract(deployments.tokens.long);
      console.log('LONG verification successful.');
    } catch (error) {
      console.error('LONG verification failed: ', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed: ', error);
  process.exit(1);
});
