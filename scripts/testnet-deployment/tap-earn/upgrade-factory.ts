import fs from 'fs';
import { ethers, upgrades } from 'hardhat';
import { waitForNextBlock } from '../../../helpers/wait';
import { verifyContract } from '../../../helpers/verify';

function parseBoolEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

const UPGRADE = parseBoolEnv(process.env.UPGRADE, true);
const VERIFY = parseBoolEnv(process.env.VERIFY, true);
const REFERRAL_MAX_ARRAY_LENGTH = Number(process.env.REFERRAL_MAX_ARRAY_LENGTH ?? '20');

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
      vestingWallet: deployments.VestingWalletImplementation.address,
    };
    const referralPercentages = [0, 0, 0, 0, 0] as [number, number, number, number, number];
    const factoryBeforeUpgrade = await ethers.getContractAt('Factory', deployments.Factory.proxy);
    for (let i = 0; i < referralPercentages.length; i += 1) {
      referralPercentages[i] = Number((await factoryBeforeUpgrade.usedToPercentage(i)).toString());
    }

    const upgraded = await upgrades.upgradeProxy(deployments.Factory.proxy, FactoryV2, {
      kind: 'transparent',
      unsafeAllow: ['constructor'],
      unsafeAllowLinkedLibraries: true,
    });

    await waitForNextBlock();

    // `upgradeToV2` is one-time (reinitializer(2)); skip if already initialized.
    const upgradedFactory = await ethers.getContractAt('Factory', upgraded.address);
    try {
      await upgradedFactory.callStatic.upgradeToV2(
        royalties,
        implementations,
        referralPercentages,
        REFERRAL_MAX_ARRAY_LENGTH,
      );
      const upgradeToV2Tx = await upgradedFactory.upgradeToV2(
        royalties,
        implementations,
        referralPercentages,
        REFERRAL_MAX_ARRAY_LENGTH,
      );
      await upgradeToV2Tx.wait();
      console.log('Factory upgradeToV2() executed.');
    } catch (error: any) {
      const message = error?.message ?? '';
      if (message.includes('InvalidInitialization')) {
        console.log('Factory already initialized to v2; skipping upgradeToV2().');
      } else {
        throw error;
      }
    }

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
