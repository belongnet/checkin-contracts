import { ethers, upgrades } from 'hardhat';

import { verifyContract } from '../../../helpers/verify';
import { waitForNextBlock } from '../../../helpers/wait';

import fs from 'fs';

const ENV_UPGRADE = process.env.UPGRADE?.toLowerCase() === 'true';
const ENV_VERIFY = process.env.VERIFY?.toLowerCase() === 'true';
const UPGRADE = ENV_UPGRADE ?? true; // <-- ENV_UPGRADE is `false` (not nullish), so UPGRADE=false
const VERIFY = ENV_VERIFY ?? true; // same

async function main() {
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

  if (UPGRADE && deployments.factory) {
    console.log('Upgrade Factory: ');

    // Validate environment variables
    if (
      !deployments.libraries.signatureVerifier ||
      !deployments.implementations.accessToken ||
      !deployments.implementations.creditToken ||
      !deployments.implementations.royaltiesReceiver ||
      !deployments.implementations.vestingWallet
    ) {
      throw new Error(
        `Missing required environment variables:\nSigantureVerifier: ${deployments.libraries.signatureVerifier}\nAccessToken: ${deployments.libraries.accessToken}\nCreditTokenImplementation: ${deployments.libraries.creditToken}\nRoyaltiesReceiverV2Implementation: ${deployments.libraries.royaltiesReceiver}\nVestingWalletImplementation: ${deployments.libraries.vestingWallet}`,
      );
    }

    // Validate addresses
    for (const addr of [
      deployments.libraries.signatureVerifier,
      deployments.implementations.accessToken,
      deployments.implementations.royaltiesReceiver,
      deployments.implementations.creditToken,
      deployments.implementations.vestingWallet,
      deployments.factory.proxy,
    ]) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }

    const FactoryV2 = await ethers.getContractFactory('Factory', {
      libraries: { SignatureVerifier: deployments.libraries.signatureVerifier },
    });

    // (Optional) pre-check: will fail if layout breaks
    await upgrades.validateUpgrade(deployments.factory.proxy, FactoryV2, {
      kind: 'transparent',
      unsafeAllow: ['constructor'],
      unsafeAllowLinkedLibraries: true,
    });

    const royalties = { amountToCreator: 8000, amountToPlatform: 2000 };

    console.log('Upgrading Factory contract...');
    const factory = await upgrades.upgradeProxy(deployments.factory.proxy, FactoryV2, {
      kind: 'transparent',
      call: { fn: 'upgradeToV2', args: [royalties, deployments.implementations] },
      unsafeAllow: ['constructor'],
      unsafeAllowLinkedLibraries: true,
    });
    await waitForNextBlock();

    const newImplementation = await upgrades.erc1967.getImplementationAddress(factory.address);

    // Update deployments object
    deployments.factory.proxy = factory.address;
    deployments.factory.implementation = newImplementation;
    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Upgraded Factory proxy still at: ', factory.address);
    console.log('New Factory implementation at: ', newImplementation);

    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    try {
      if (!deployments.factory?.proxy) {
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
