import dotenv from 'dotenv';
import fs from 'fs';
import { ethers } from 'hardhat';
import { verifyContract } from '../../../helpers/verify';
import { Helper } from '../../../typechain-types';
import { deployHelper } from '../../../helpers/deployLibraries';

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
    console.log('Deploying: ');

    console.log('Deploying Helper contract...');
    const helper: Helper = await deployHelper();

    // Update deployments object
    deployments = {
      ...deployments,
      Helper: {
        address: helper.address,
      },
    };

    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed Helper to: ', helper.address);
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    try {
      if (!deployments.Helper?.address) {
        throw new Error('No Helper deployment data found for verification.');
      }
      await verifyContract(deployments.Helper.address);
      console.log('Helper verification successful.');
    } catch (error) {
      console.error('Helper verification failed:', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed: ', error);
  process.exit(1);
});
