import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import { deployEscrow } from '../../../helpers/deployFixtures';
import { verifyContract } from '../../../helpers/verify';
import { Escrow } from '../../../typechain-types';

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

  if (!deployments.checkIn) {
    deployments.checkIn = {};
  }

  if (DEPLOY) {
    console.log('Deploy Escrow: ');

    // Validate environment variables
    if (!deployments.checkIn.address) {
      throw new Error(`Missing required environment variable:\nBelongCheckIn: ${deployments.checkIn.address}`);
    }

    // Validate address
    if (!ethers.utils.isAddress(deployments.checkIn.address)) {
      throw new Error(`Invalid address: ${deployments.checkIn.address}`);
    }

    console.log('Deploying Escrow contract...');
    const escrow: Escrow = await deployEscrow(deployments.checkIn.address);

    // Update deployments object
    deployments.checkIn.escrow = escrow.address;
    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed Escrow to: ', escrow.address);
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    try {
      if (!deployments.checkIn.escrow) {
        throw new Error('No Escrow deployment data found for verification.');
      }
      await verifyContract(deployments.checkIn.escrow);
      console.log('Escrow verification successful.');
    } catch (error) {
      console.error('Escrow verification failed: ', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed:', error);
  process.exit(1);
});
