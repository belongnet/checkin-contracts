import { ethers, upgrades } from 'hardhat';

import { waitForNextBlock } from '../../../helpers/wait';
import { assertContractMatchesLocalBuild, assertLibraryMatchesLocalBuild } from '../../helpers/bytecode';
import { envFlag } from '../../helpers/env';
import { verifyContract } from '../../helpers/verify-contract';

import fs from 'fs';

const UPGRADE = envFlag('UPGRADE', true);
const VERIFY = envFlag('VERIFY', true);
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

    // The new implementation is linked to this library, so it must be this checkout's build. The same
    // goes for the clone implementations that upgradeToV2() registers in the Factory.
    await assertLibraryMatchesLocalBuild('SignatureVerifier', deployments.libraries.signatureVerifier);
    await assertContractMatchesLocalBuild('AccessToken', deployments.implementations.accessToken, {
      SignatureVerifier: deployments.libraries.signatureVerifier,
    });
    await assertContractMatchesLocalBuild('RoyaltiesReceiverV2', deployments.implementations.royaltiesReceiver);
    await assertContractMatchesLocalBuild('CreditToken', deployments.implementations.creditToken);
    await assertContractMatchesLocalBuild('VestingWalletExtended', deployments.implementations.vestingWallet);

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
    const referralPercentages = [0, 0, 0, 0, 0] as [number, number, number, number, number];
    const factoryBeforeUpgrade = await ethers.getContractAt('Factory', deployments.factory.proxy);
    for (let i = 0; i < referralPercentages.length; i += 1) {
      referralPercentages[i] = Number((await factoryBeforeUpgrade.usedToPercentage(i)).toString());
    }

    console.log('Upgrading Factory contract...');
    const factory = await upgrades.upgradeProxy(deployments.factory.proxy, FactoryV2, {
      kind: 'transparent',
      unsafeAllow: ['constructor'],
      unsafeAllowLinkedLibraries: true,
    });
    await waitForNextBlock();

    // Record the new implementation right away: a failure below must not leave the record stale.
    const newImplementation = await upgrades.erc1967.getImplementationAddress(factory.address);

    // Update deployments object
    deployments.factory.proxy = factory.address;
    deployments.factory.implementation = newImplementation;
    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Upgraded Factory proxy still at: ', factory.address);
    console.log('New Factory implementation at: ', newImplementation);

    // `upgradeToV2` is only needed once (reinitializer(2)) and is onlyOwner.
    // For already-initialized proxies, this call reverts with `InvalidInitialization`.
    const upgradedFactory = await ethers.getContractAt('Factory', factory.address);
    try {
      await upgradedFactory.callStatic.upgradeToV2(
        royalties,
        deployments.implementations,
        referralPercentages,
        REFERRAL_MAX_ARRAY_LENGTH,
      );
      const upgradeToV2Tx = await upgradedFactory.upgradeToV2(
        royalties,
        deployments.implementations,
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
        throw new Error(
          `The Factory proxy ${factory.address} WAS upgraded to implementation ${newImplementation} and ${deploymentFile} was updated, but upgradeToV2() failed. It is onlyOwner and must be sent by the Factory owner.`,
          { cause: error },
        );
      }
    }

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
