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
    console.log('Upgrading Factory contract...');

    // Read addresses from environment variables
    const SignatureVerifier = deployments.SignatureVerifier.address;
    const Factory = deployments.Factory.proxy;
    const accessToken = deployments.AccessTokenImplementation.address;
    const royaltiesReceiver = deployments.RoyaltiesReceiverV2Implementation.address;
    const creditToken = deployments.CreditTokenImplementation.address;

    // Validate environment variables
    if (!SignatureVerifier || !Factory || !accessToken || !royaltiesReceiver || !creditToken) {
      throw new Error(
        'Missing required environment variables: SignatureVerifier, Factory, AccessTokenImplementation, RoyaltiesReceiverV2Implementation,CreditTokenImplementation',
      );
    }

    // Validate addresses
    for (const addr of [SignatureVerifier, Factory, accessToken, royaltiesReceiver, creditToken]) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }

    const FactoryV2 = await ethers.getContractFactory('Factory', {
      libraries: { SignatureVerifier },
    });

    // (Optional) pre-check: will fail if layout breaks
    await upgrades.validateUpgrade(Factory, FactoryV2, {
      kind: 'transparent',
      unsafeAllow: ['constructor'],
      unsafeAllowLinkedLibraries: true,
    });

    const royalties = { amountToCreator: 8000, amountToPlatform: 2000 };
    const implementations = {
      accessToken,
      creditToken,
      royaltiesReceiver,
    };

    const upgraded = await upgrades.upgradeProxy(Factory, FactoryV2, {
      kind: 'transparent',
      call: { fn: 'upgradeToV2', args: [royalties, implementations] },
      unsafeAllow: ['constructor'],
      unsafeAllowLinkedLibraries: true,
    });

    await waitForNextBlock();

    const newImpl = await upgrades.erc1967.getImplementationAddress(upgraded.address);
    console.log('Upgraded proxy still at: ', upgraded.address);
    console.log('New implementation at: ', newImpl);

    // Update deployments object
    deployments = {
      ...deployments,
      Factory: {
        proxy: upgraded.address,
        implementation: newImpl,
      },
    };
    console.log('Done.');
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
