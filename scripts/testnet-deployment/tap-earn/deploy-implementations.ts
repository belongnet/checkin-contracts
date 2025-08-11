import dotenv from 'dotenv';
import fs from 'fs';
import { verifyContract } from '../../../helpers/verify';
import {
  deployAccessTokenImplementation,
  deployCreditTokenImplementation,
  deployRoyaltiesReceiverV2Implementation,
} from '../../../helpers/deployFixtures';
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
    console.log('Deploying AccessTokenImplementation: ');
    const accessTokenImpl = await deployAccessTokenImplementation('0x83618D58A1A4648BC31B7b7CD0DB08EFD39708bB');
    // Update deployments object
    deployments = {
      ...deployments,
      AccessTokenImplementation: {
        address: accessTokenImpl.address,
      },
    };

    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed AccessTokenImplementation to: ', accessTokenImpl.address);

    console.log('Deploying RoyaltiesReceiverV2Implementation: ');
    const rrImpl = await deployRoyaltiesReceiverV2Implementation();
    // Update deployments object
    deployments = {
      ...deployments,
      RoyaltiesReceiverV2Implementation: {
        address: rrImpl.address,
      },
    };

    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed RoyaltiesReceiverV2Implementation to: ', rrImpl.address);

    console.log('Deploying CreditTokenImplementation: ');
    const creditTokenImpl = await deployCreditTokenImplementation();
    // Update deployments object
    deployments = {
      ...deployments,
      CreditTokenImplementation: {
        address: creditTokenImpl.address,
      },
    };

    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed CreditTokenImplementation to: ', creditTokenImpl.address);
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification AccessTokenImplementation:');
    try {
      if (!deployments.AccessTokenImplementation?.address) {
        throw new Error('No AccessTokenImplementation deployment data found for verification.');
      }
      await verifyContract(deployments.AccessTokenImplementation.address);
      console.log('AccessTokenImplementation verification successful.');
    } catch (error) {
      console.error('AccessTokenImplementation verification failed:', error);
    }
    console.log('Done.');

    console.log('Verification RoyaltiesReceiverV2Implementation:');
    try {
      if (!deployments.RoyaltiesReceiverV2Implementation?.address) {
        throw new Error('No RoyaltiesReceiverV2Implementation deployment data found for verification.');
      }
      await verifyContract(deployments.RoyaltiesReceiverV2Implementation.address);
      console.log('RoyaltiesReceiverV2Implementation verification successful.');
    } catch (error) {
      console.error('RoyaltiesReceiverV2Implementation verification failed:', error);
    }
    console.log('Done.');

    console.log('Verification CreditTokenImplementation:');
    try {
      if (!deployments.CreditTokenImplementation?.address) {
        throw new Error('No CreditTokenImplementation deployment data found for verification.');
      }
      await verifyContract(deployments.CreditTokenImplementation.address);
      console.log('CreditTokenImplementation verification successful.');
    } catch (error) {
      console.error('CreditTokenImplementation verification failed:', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed:', error);
  process.exit(1);
});
