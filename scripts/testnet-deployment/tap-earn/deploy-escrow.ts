import { Escrow } from '../../../typechain-types';
import dotenv from 'dotenv';
import fs from 'fs';
import { deployEscrow } from '../../../test/v2/helpers/deployFixtures'; // Adjust if path differs
import { verifyContract } from '../../../helpers/verify';
import { ethers } from 'hardhat';

dotenv.config();

const DEPLOY = true;
const VERIFY = true;

async function deploy() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentsDir = 'deployments';
  const deploymentFile = `${deploymentsDir}/chainId-${chainId}.json`;

  // Ensure deployments directory exists
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Initialize deployments object
  let deployments = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }

  if (DEPLOY) {
    console.log('Deploying Escrow contract...');

    // Read addresses from environment variables
    const belongCheckIn = process.env.TAP_EARN_ADDRESS;

    // Validate environment variables
    if (!belongCheckIn) {
      throw new Error('Missing required environment variable: TAP_EARN_ADDRESS');
    }

    // Validate address
    if (!ethers.utils.isAddress(belongCheckIn)) {
      throw new Error(`Invalid address: ${belongCheckIn}`);
    }

    const escrow: Escrow = await deployEscrow(belongCheckIn);

    // Update deployments object
    deployments = {
      ...deployments,
      Escrow: {
        address: escrow.address,
        parameters: [belongCheckIn],
      },
    };

    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed Escrow to:', escrow.address);
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification:');
    try {
      if (!deployments.Escrow?.address) {
        throw new Error('No Escrow deployment data found for verification.');
      }
      await verifyContract(deployments.Escrow.address);
      console.log('Escrow verification successful.');
    } catch (error) {
      console.error('Escrow verification failed:', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed:', error);
  process.exit(1);
});
