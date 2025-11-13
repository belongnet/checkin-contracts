import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import {
  deployAccessTokenImplementation,
  deployCreditTokenImplementation,
  deployRoyaltiesReceiverV2Implementation,
  deployVestingWalletImplementation,
} from '../../../helpers/deployFixtures';
import { verifyContract } from '../../../helpers/verify';

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

  if (!deployments.implementations) {
    deployments.implementations = {};
  }

  if (DEPLOY) {
    console.log('Deploy Implementations: ');
    // Validate environment variables
    if (!deployments.libraries.sigantureVerifier) {
      throw new Error('Missing required environment variables: SignatureVerifier');
    }

    // Validate addresses
    for (const addr of [deployments.libraries.sigantureVerifier]) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }

    console.log('Deploying AccessTokenImplementation contract...');
    const accessTokenImpl = await deployAccessTokenImplementation(deployments.libraries.sigantureVerifier);
    // Update deployments object
    deployments.implementations.accessToken = accessTokenImpl.address;
    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed AccessTokenImplementation to: ', accessTokenImpl.address);

    console.log('Deploying CreditTokenImplementation contract...');
    const creditTokenImpl = await deployCreditTokenImplementation();
    // Update deployments object
    deployments.implementations.creditToken = creditTokenImpl.address;
    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed CreditTokenImplementation to: ', creditTokenImpl.address);

    console.log('Deploying RoyaltiesReceiverV2Implementation contract...');
    const rrImpl = await deployRoyaltiesReceiverV2Implementation();
    // Update deployments object
    deployments.implementations.royaltiesReceiver = rrImpl.address;
    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed RoyaltiesReceiverV2Implementation to: ', rrImpl.address);

    console.log('Deploying VestingWalletImplementation contract...');
    const vestingWalletImpl = await deployVestingWalletImplementation();
    // Update deployments object
    deployments.implementations.vestingWallet = vestingWalletImpl.address;
    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed VestingWalletImplementation to: ', vestingWalletImpl.address);

    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification AccessTokenImplementation: ');
    try {
      if (!deployments.implementations.accessToken) {
        throw new Error('No AccessTokenImplementation deployment data found for verification.');
      }
      await verifyContract(deployments.implementations.accessToken);
      console.log('AccessTokenImplementation verification successful.');
    } catch (error) {
      console.error('AccessTokenImplementation verification failed: ', error);
    }
    console.log('Done.');

    console.log('Verification CreditTokenImplementation: ');
    try {
      if (!deployments.implementations.creditToken) {
        throw new Error('No CreditTokenImplementation deployment data found for verification.');
      }
      await verifyContract(deployments.implementations.creditToken);
      console.log('CreditTokenImplementation verification successful.');
    } catch (error) {
      console.error('CreditTokenImplementation verification failed: ', error);
    }
    console.log('Done.');

    console.log('Verification RoyaltiesReceiverV2Implementation: ');
    try {
      if (!deployments.implementations.royaltiesReceiver) {
        throw new Error('No RoyaltiesReceiverV2Implementation deployment data found for verification.');
      }
      await verifyContract(deployments.implementations.royaltiesReceiver);
      console.log('RoyaltiesReceiverV2Implementation verification successful.');
    } catch (error) {
      console.error('RoyaltiesReceiverV2Implementation verification failed: ', error);
    }
    console.log('Done.');

    console.log('Verification VestingWalletImplementation:');
    try {
      if (!deployments.implementations.vestingWallet) {
        throw new Error('No VestingWalletImplementation deployment data found for verification.');
      }
      await verifyContract(deployments.implementations.vestingWallet);
      console.log('VestingWalletImplementation verification successful.');
    } catch (error) {
      console.error('VestingWalletImplementation verification failed: ', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed:', error);
  process.exit(1);
});
