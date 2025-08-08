import dotenv from 'dotenv';
import fs from 'fs';
import { verifyContract } from './verify';
import { ethers } from 'hardhat';
import { deploySignatureVerifier } from '../../test/v2/helpers/deployLibraries';
import { SignatureVerifier } from '../../typechain-types';

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
    console.log('Deploying: ');

    console.log('Deploying SignatureVerifier contract...');
    const signatureVerifier: SignatureVerifier = await deploySignatureVerifier();

    // Update deployments object
    deployments = {
      ...deployments,
      SigantureVerifier: {
        address: signatureVerifier.address,
      },
    };

    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed SignatureVerifier to: ', signatureVerifier.address);
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    try {
      if (!deployments.SigantureVerifier?.address) {
        throw new Error('No SignatureVerifier deployment data found for verification.');
      }
      await verifyContract(deployments.SigantureVerifier.address);
      console.log('SigantureVerifier verification successful.');
    } catch (error) {
      console.error('SigantureVerifier verification failed:', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed: ', error);
  process.exit(1);
});
