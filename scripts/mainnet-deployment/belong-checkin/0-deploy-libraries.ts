import dotenv from 'dotenv';
import fs from 'fs';
import { verifyContract } from '../../../helpers/verify';
import { ethers } from 'hardhat';
import { deployHelper, deploySignatureVerifier } from '../../../helpers/deployLibraries';
import { DualDexSwapV4Lib, Helper, SignatureVerifier } from '../../../typechain-types';
import { deployDualDexSwapV4Lib } from '../../../helpers/deployFixtures';

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

  if (DEPLOY) {
    console.log('Deploy SignatureVerifier: ');

    console.log('Deploying SignatureVerifier contract...');
    const signatureVerifier: SignatureVerifier = await deploySignatureVerifier();

    // Update deployments object
    deployments.libraries.sigantureVerifier = signatureVerifier.address;
    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed SignatureVerifier to: ', signatureVerifier.address);

    console.log('Deploy Helper: ');

    console.log('Deploying Helper contract...');
    const helper: Helper = await deployHelper();

    // Update deployments object
    deployments.libraries.helper = helper.address;

    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed Helper to: ', helper.address);

    console.log('Deploy DualDexSwapV4Lib: ');

    console.log('Deploying DualDexSwapV4Lib contract...');
    const dualDexSwapV4Lib: DualDexSwapV4Lib = await deployDualDexSwapV4Lib();

    // Update deployments object
    deployments.libraries.dualDexSwapV4Lib = dualDexSwapV4Lib.address;

    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed DualDexSwapV4Lib to: ', dualDexSwapV4Lib.address);

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

    try {
      if (!deployments.libraries.helper) {
        throw new Error('No Helper deployment data found for verification.');
      }
      await verifyContract(deployments.libraries.helper);
      console.log('Helper verification successful.');
    } catch (error) {
      console.error('Helper verification failed: ', error);
    }

    try {
      if (!deployments.libraries.dualDexSwapV4Lib) {
        throw new Error('No DualDexSwapV4Lib deployment data found for verification.');
      }
      await verifyContract(deployments.libraries.dualDexSwapV4Lib);
      console.log('DualDexSwapV4Lib verification successful.');
    } catch (error) {
      console.error('DualDexSwapV4Lib verification failed: ', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed: ', error);
  process.exit(1);
});
