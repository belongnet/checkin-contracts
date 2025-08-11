import { Escrow } from '../../../typechain-types';
import dotenv from 'dotenv';
import fs from 'fs';
import { verifyContract } from '../../../helpers/verify';
import { ethers } from 'hardhat';
import { deployEscrow } from '../../../helpers/deployFixtures';

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
  let deployments = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }

  if (DEPLOY) {
    console.log('Deploying Escrow contract...');

    // Read addresses from environment variables
    const tapEarn = deployments.TapAndEarn.address;

    // Validate environment variables
    if (!tapEarn) {
      throw new Error('Missing required environment variable: TAP_EARN_ADDRESS');
    }

    // Validate address
    if (!ethers.utils.isAddress(tapEarn)) {
      throw new Error(`Invalid address: ${tapEarn}`);
    }

    const escrow: Escrow = await deployEscrow(tapEarn);

    // Update deployments object
    deployments = {
      ...deployments,
      Escrow: {
        address: escrow.address,
        parameters: [tapEarn],
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
