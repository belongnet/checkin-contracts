import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import { deploySignatureVerifier } from '../../../helpers/deployLibraries';
import { verifyContract } from '../../../helpers/verify';
import { SignatureVerifier } from '../../../typechain-types';

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
  // Ensure libraries and SigantureVerifier objects exist
  if (!deployments.libraries) {
    deployments.libraries = {};
  }

  if (DEPLOY && !deployments.libraries.SigantureVerifier) {
    console.log('Deploy SignatureVerifier: ');

    console.log('Deploying SignatureVerifier contract...');
    const signatureVerifier: SignatureVerifier = await deploySignatureVerifier();

    // Update deployments object
    deployments.libraries.sigantureVerifier = signatureVerifier.address;
    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed SignatureVerifier to: ', signatureVerifier.address);

    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    try {
      if (!deployments.libraries.sigantureVerifier) {
        throw new Error('No SignatureVerifier deployment data found for verification.');
      }
      await verifyContract(deployments.libraries.sigantureVerifier);
      console.log('SigantureVerifier verification successful.');
    } catch (error) {
      console.error('SigantureVerifier verification failed: ', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed: ', error);
  process.exit(1);
});
