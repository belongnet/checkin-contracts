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

  if (UPGRADE && deployments.checkIn) {
    console.log('Upgrade CheckIn: ');

    const BelongCheckIn = await ethers.getContractFactory('BelongCheckIn', {
      libraries: {
        SignatureVerifier: deployments.libraries.sigantureVerifier,
        Helper: deployments.libraries.helper,
        DualDexSwapV4Lib: deployments.libraries.dualDexSwapV4,
      },
    });

    // (Optional) pre-check: will fail if layout breaks
    await upgrades.validateUpgrade(deployments.checkIn.address, BelongCheckIn, {
      kind: 'transparent',
      unsafeAllow: ['constructor'],
      unsafeAllowLinkedLibraries: true,
    });

    console.log('Upgrading CheckIn contract...');
    const checkIn = await upgrades.upgradeProxy(deployments.checkIn.address, BelongCheckIn, {
      kind: 'transparent',
      unsafeAllow: ['constructor'],
      unsafeAllowLinkedLibraries: true,
    });
    await waitForNextBlock();

    const newImplementation = await upgrades.erc1967.getImplementationAddress(checkIn.address);

    // Update deployments object
    deployments.checkIn.address = checkIn.address;
    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Upgraded CheckIn proxy still at: ', checkIn.address);
    console.log('New Factory implementation at: ', newImplementation);

    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    try {
      if (!deployments.checkIn?.address) {
        throw new Error('No Factory deployment data found for verification.');
      }
      await verifyContract(deployments.checkIn.address);
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
