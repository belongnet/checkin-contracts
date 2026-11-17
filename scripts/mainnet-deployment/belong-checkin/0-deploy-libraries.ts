// Deploys the libraries the BelongCheckIn stack links against and records their addresses.
//
// Optional: LIBRARIES (comma-separated record keys: signatureVerifier, helper, dualDexSwapV4Lib; unset
//   means all of them), DEPLOY (default true), VERIFY (default true), FORCE_REDEPLOY.
// A library that is already recorded is only replaced with FORCE_REDEPLOY=true, and the replaced
// address is kept as libraries.<key>Previous.
//
// Usage (replace one library):
//   LIBRARIES=signatureVerifier FORCE_REDEPLOY=true npx hardhat run \
//     scripts/mainnet-deployment/belong-checkin/0-deploy-libraries.ts --network <net>

import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import { deployDualDexSwapV4Lib } from '../../../helpers/deployFixtures';
import { deployHelper, deploySignatureVerifier } from '../../../helpers/deployLibraries';
import { assertNotRecorded, envFlag } from '../../helpers/env';
import { verifyContract } from '../../helpers/verify-contract';

import fs from 'fs';

dotenv.config();

type LibraryKey = 'signatureVerifier' | 'helper' | 'dualDexSwapV4Lib';

const LIBRARY_KEYS: LibraryKey[] = ['signatureVerifier', 'helper', 'dualDexSwapV4Lib'];

const LIBRARIES: Record<LibraryKey, { contractName: string; deploy: () => Promise<{ address: string }> }> = {
  signatureVerifier: { contractName: 'SignatureVerifier', deploy: deploySignatureVerifier },
  helper: { contractName: 'Helper', deploy: deployHelper },
  dualDexSwapV4Lib: { contractName: 'DualDexSwapV4Lib', deploy: deployDualDexSwapV4Lib },
};

// Record keys selected by the LIBRARIES env value, in deployment order; unset or empty selects all.
function parseLibraries(value: string | undefined): LibraryKey[] {
  const names = (value ?? '')
    .split(',')
    .map(name => name.trim().toLowerCase())
    .filter(name => name !== '');
  if (names.length === 0) {
    return LIBRARY_KEYS;
  }
  const unknownName = names.find(name => !LIBRARY_KEYS.some(key => key.toLowerCase() === name));
  if (unknownName !== undefined) {
    throw new Error(
      `Unknown library "${unknownName.slice(0, 30)}" in LIBRARIES. Accepted names: ${LIBRARY_KEYS.join(', ')}.`,
    );
  }
  return LIBRARY_KEYS.filter(key => names.includes(key.toLowerCase()));
}

const DEPLOY = envFlag('DEPLOY', true);
const VERIFY = envFlag('VERIFY', true);
const SELECTED = parseLibraries(process.env.LIBRARIES);

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
  // Ensure the libraries object exists
  if (!deployments.libraries) {
    deployments.libraries = {};
  }

  console.log(`Libraries: ${SELECTED.join(', ')}`);

  if (DEPLOY) {
    // Checked up front, so the run never stops half-way after deploying some of the libraries.
    for (const key of SELECTED) {
      assertNotRecorded(deployments.libraries[key], LIBRARIES[key].contractName);
    }

    for (const key of SELECTED) {
      const { contractName, deploy: deployLibrary } = LIBRARIES[key];
      console.log(`Deploying ${contractName} contract...`);
      const library = await deployLibrary();

      // A replaced library stays in the record: live contracts are linked to it until they are upgraded.
      const previous = deployments.libraries[key];
      if (typeof previous === 'string' && previous !== '' && previous.toLowerCase() !== library.address.toLowerCase()) {
        deployments.libraries[`${key}Previous`] = previous;
      }
      deployments.libraries[key] = library.address;

      // Written after every library, so a later failure does not lose what is already deployed.
      fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
      console.log(`Deployed ${contractName} to: `, library.address);
    }

    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    for (const key of SELECTED) {
      const { contractName } = LIBRARIES[key];
      try {
        if (!deployments.libraries[key]) {
          throw new Error(`No ${contractName} deployment data found for verification.`);
        }
        await verifyContract(deployments.libraries[key]);
        console.log(`${contractName} verification successful.`);
      } catch (error) {
        console.error(`${contractName} verification failed: `, error);
      }
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed: ', error);
  process.exit(1);
});
