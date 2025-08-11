import { Staking } from '../../../typechain-types';
import dotenv from 'dotenv';
import fs from 'fs';
import { deployStaking } from '../../../test/v2/helpers/deployFixtures';
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
    console.log('Deploying Staking contract...');

    // Read addresses from environment variables
    const owner = process.env.OWNER_ADDRESS;
    const treasury = process.env.TREASURY_ADDRESS;
    const long = process.env.LONG_ADDRESS;

    // Validate environment variables
    if (!owner || !treasury || !long) {
      throw new Error('Missing required environment variables: OWNER_ADDRESS, TREASURY_ADDRESS, LONG_ADDRESS');
    }

    // Validate addresses
    for (const addr of [owner, treasury, long]) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }

    const staking: Staking = await deployStaking(owner, treasury, long);

    // Update deployments object
    deployments = {
      ...deployments,
      Staking: {
        address: staking.address,
        parameters: [owner, treasury, long],
      },
    };

    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed Staking to: ', staking.address);
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification:');
    try {
      if (!deployments.Staking?.address || !deployments.Staking?.parameters) {
        throw new Error('No Staking deployment data found for verification.');
      }
      await verifyContract(deployments.Staking.address, deployments.Staking.parameters);
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
