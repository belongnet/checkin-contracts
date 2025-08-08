import { LONG } from '../../../typechain-types';
import dotenv from 'dotenv';
import fs from 'fs';
import { deployLONG } from '../../../test/v2/helpers/deployFixtures';
import { verifyContract } from '../../helpers/verify';
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
    console.log('Deploying:');
    // Read addresses from environment variables
    const adminAddress = process.env.ADMIN_ADDRESS;
    const pauserAddress = process.env.PAUSER_ADDRESS;
    const minterAddress = process.env.MINTER_ADDRESS;
    const burnerAddress = process.env.BURNER_ADDRESS;

    // Validate environment variables
    if (!adminAddress || !pauserAddress || !minterAddress || !burnerAddress) {
      throw new Error(
        'Missing required environment variables: ADMIN_ADDRESS, PAUSER_ADDRESS, MINTER_ADDRESS, BURNER_ADDRESS',
      );
    }

    // Validate addresses
    for (const addr of [adminAddress, pauserAddress, minterAddress, burnerAddress]) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }

    console.log('NFT:');
    const long: LONG = await deployLONG(adminAddress, pauserAddress, minterAddress, burnerAddress);

    // Update deployments object
    deployments = {
      ...deployments,
      LONG: {
        address: long.address,
        parameters: [adminAddress, pauserAddress, minterAddress, burnerAddress],
      },
    };

    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed LONG to:', long.address);
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification:');
    try {
      if (!deployments.LONG?.address || !deployments.LONG?.parameters) {
        throw new Error('No LONG deployment data found for verification.');
      }
      await verifyContract(deployments.LONG.address, deployments.LONG.parameters);
      console.log('LONG verification successful.');
    } catch (error) {
      console.error('LONG verification failed:', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed:', error);
  process.exit(1);
});
