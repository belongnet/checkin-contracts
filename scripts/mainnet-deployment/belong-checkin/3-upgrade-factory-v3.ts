import { ethers, upgrades } from 'hardhat';

import { verifyContract } from '../../../helpers/verify';
import { waitForNextBlock } from '../../../helpers/wait';

import fs from 'fs';

function parseBoolEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

const UPGRADE = parseBoolEnv(process.env.UPGRADE, true);
const VERIFY = parseBoolEnv(process.env.VERIFY, true);

async function main() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentsDir = 'deployments';
  const deploymentFile = `${deploymentsDir}/chainId-${chainId}.json`;

  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  let deployments: any = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }

  if (UPGRADE) {
    console.log('Upgrade Factory to V3: ');

    if (
      !deployments.libraries?.signatureVerifier ||
      !deployments.implementations?.vestingWallet ||
      !deployments.factory?.proxy
    ) {
      throw new Error(
        `Missing required deployment data:\nSignatureVerifier: ${deployments.libraries?.signatureVerifier}\nVestingWalletImplementation: ${deployments.implementations?.vestingWallet}\nFactoryProxy: ${deployments.factory?.proxy}`,
      );
    }

    for (const addr of [
      deployments.libraries.signatureVerifier,
      deployments.implementations.vestingWallet,
      deployments.factory.proxy,
    ]) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }

    const FactoryV3 = await ethers.getContractFactory('Factory', {
      libraries: { SignatureVerifier: deployments.libraries.signatureVerifier },
    });

    await upgrades.validateUpgrade(deployments.factory.proxy, FactoryV3, {
      kind: 'transparent',
      unsafeAllow: ['constructor'],
      unsafeAllowLinkedLibraries: true,
    });

    console.log('Upgrading Factory proxy implementation...');
    const factory = await upgrades.upgradeProxy(deployments.factory.proxy, FactoryV3, {
      kind: 'transparent',
      unsafeAllow: ['constructor'],
      unsafeAllowLinkedLibraries: true,
    });
    await waitForNextBlock();

    const upgradedFactory = await ethers.getContractAt('Factory', factory.address);
    const vestingWalletImplementation = deployments.implementations.vestingWallet;

    // `upgradeToV3` is a one-time reinitializer.
    try {
      await upgradedFactory.callStatic.upgradeToV3(vestingWalletImplementation);
      const upgradeToV3Tx = await upgradedFactory.upgradeToV3(vestingWalletImplementation);
      await upgradeToV3Tx.wait();
      console.log('Factory upgradeToV3() executed.');
    } catch (error: any) {
      const message = error?.message ?? '';
      if (message.includes('InvalidInitialization')) {
        console.log('Factory already initialized to v3; skipping upgradeToV3().');
      } else {
        throw error;
      }
    }

    const newImplementation = await upgrades.erc1967.getImplementationAddress(factory.address);

    deployments.factory.proxy = factory.address;
    deployments.factory.implementation = newImplementation;
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));

    console.log('Factory proxy: ', factory.address);
    console.log('Factory implementation: ', newImplementation);
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

