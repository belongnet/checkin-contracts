import fs from 'fs';
import { ethers, upgrades } from 'hardhat';
import { waitForNextBlock } from '../../../helpers/wait';
import { verifyContract } from '../../../helpers/verify';

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
  let deployments = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }
  if (UPGRADE) {
    const FactoryV2 = await ethers.getContractFactory('Factory', {
      libraries: { SignatureVerifier: deployments.SignatureVerifier.address },
    });

    // (Optional) pre-check: will fail if layout breaks
    await upgrades.validateUpgrade(deployments.Factory.proxy, FactoryV2, {
      kind: 'transparent',
      unsafeAllow: ['constructor'],
      unsafeAllowLinkedLibraries: true,
    });

    const royalties = { amountToCreator: 8000, amountToPlatform: 2000 };
    const implementations = {
      accessToken: deployments.AccessTokenImplementation.address,
      creditToken: deployments.CreditTokenImplementation.address,
      royaltiesReceiver: deployments.RoyaltiesReceiverV2Implementation.address,
    };

    const upgraded = await upgrades.upgradeProxy(deployments.Factory.proxy, FactoryV2, {
      kind: 'transparent',
      call: { fn: 'upgradeToV2', args: [royalties, implementations] },
      unsafeAllow: ['constructor'],
      unsafeAllowLinkedLibraries: true,
    });

    await waitForNextBlock();

    const newImpl = await upgrades.erc1967.getImplementationAddress(upgraded.address);
    console.log('Upgraded proxy still at:', upgraded.address);
    console.log('new impl:', await upgrades.erc1967.getImplementationAddress(upgraded.address));

    // Update deployments object
    deployments = {
      ...deployments,
      Factory: {
        proxy: upgraded.address,
        implementation: newImpl,
      },
    };
  }

  if (VERIFY) {
    console.log('Verification:');
    try {
      if (!deployments.Factory?.proxy) {
        throw new Error('No Factory deployment data found for verification.');
      }
      await verifyContract(deployments.Factory.proxy);
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
