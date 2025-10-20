import fs from 'fs';
import { ethers, upgrades } from 'hardhat';
import { waitForNextBlock } from '../../../helpers/wait';
import { verifyContract } from '../../../helpers/verify';
import dotenv from 'dotenv';
import { deployFactory } from '../../../helpers/deployFixtures';
dotenv.config();

const ENV_DEPLOY = process.env.DEPLOY?.toLowerCase() === 'true';
const ENV_VERIFY = process.env.VERIFY?.toLowerCase() === 'true';
const DEPLOY = ENV_DEPLOY ?? true; // <-- ENV_DEPLOY is `false` (not nullish), so DEPLOY=false
const VERIFY = ENV_VERIFY ?? true; // same

async function main() {
  const [deployer] = await ethers.getSigners();
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

  if (!deployments.factory) {
    deployments.factory = {};
  }

  if (DEPLOY) {
    console.log('Deploy Factory: ');

    deployments.factory.proxy = {};
    deployments.factory.implementation = {};

    const transferValidator = process.env.TRANSFER_VALIDATOR;

    // Validate environment variables
    if (
      !deployments.libraries.sigantureVerifier ||
      !deployments.implementations.accessToken ||
      !deployments.implementations.creditToken ||
      !deployments.implementations.royaltiesReceiver ||
      !deployments.implementations.vestingWallet ||
      !transferValidator
    ) {
      throw new Error(
        `Missing required environment variables:\nSignatureVerifier: ${deployments.libraries.sigantureVerifier}\nAccessTokenImplementation: ${deployments.implementations.accessToken}\nCreditTokenImplementation: ${deployments.libraries.creditToken}\nRoyaltiesReceiverV2Implementation: ${deployments.implementations.royaltiesReceiver}\nVestingWalletImplementation: ${deployments.libraries.vestingWallet}\nTRANSFER_VALIDATOR: ${transferValidator}`,
      );
    }

    // Validate addresses
    for (const addr of [
      deployments.libraries.sigantureVerifier,
      deployments.implementations.accessToken,
      deployments.implementations.royaltiesReceiver,
      deployments.implementations.creditToken,
      deployments.implementations.vestingWallet,
    ]) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }

    console.log('Deploying Factory contract...');
    const factory = await deployFactory(
      deployer.address,
      deployer.address,
      deployments.libraries.sigantureVerifier,
      transferValidator,
      deployments.implementations,
    );
    await waitForNextBlock();

    const implementation = await upgrades.erc1967.getImplementationAddress(factory.address);

    // Update deployments object
    deployments.factory.proxy = factory.address;
    deployments.factory.implementation = implementation;
    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed Factory proxy to: ', factory.address);
    console.log('Deployed Factory implementation to: ', implementation);

    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    try {
      if (!deployments.factory.proxy) {
        throw new Error('No Factory deployment data found for verification.');
      }
      await verifyContract(deployments.factory.proxy);
      console.log('Factory verification successful.');
    } catch (error) {
      console.error('Factory verification failed: ', error);
    }
    console.log('Done.');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
