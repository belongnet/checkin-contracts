import { ethers, upgrades } from 'hardhat';

import fs from 'fs';

// Registers an already-deployed BelongCheckIn proxy into the local
// .openzeppelin/<network>.json manifest so that prepare/upgrade scripts can
// run. Non-destructive: deploys nothing and sends no proxy-mutating tx.
async function main() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentFile = `deployments/chainId-${chainId}.json`;

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  const proxy = deployments.checkIn?.address;
  const signatureVerifier = deployments.libraries?.signatureVerifier;
  const helper = deployments.libraries?.helper;
  const dualDexSwapV4Lib = deployments.libraries?.dualDexSwapV4Lib;

  if (!proxy || !signatureVerifier || !helper || !dualDexSwapV4Lib) {
    throw new Error(
      `Missing required deployment data:\nproxy: ${proxy}\nSignatureVerifier: ${signatureVerifier}\nHelper: ${helper}\nDualDexSwapV4Lib: ${dualDexSwapV4Lib}`,
    );
  }

  const BelongCheckIn = await ethers.getContractFactory('BelongCheckIn', {
    libraries: {
      SignatureVerifier: signatureVerifier,
      Helper: helper,
      DualDexSwapV4Lib: dualDexSwapV4Lib,
    },
  });

  const liveImpl = await upgrades.erc1967.getImplementationAddress(proxy);
  const admin = await upgrades.erc1967.getAdminAddress(proxy);
  console.log(`chainId:            ${chainId.toString()}`);
  console.log(`proxy:              ${proxy}`);
  console.log(`live implementation:${liveImpl}`);
  console.log(`proxy admin:        ${admin}`);
  console.log('Registering proxy in the .openzeppelin manifest via forceImport...');

  await upgrades.forceImport(proxy, BelongCheckIn, {
    kind: 'transparent',
    // Linked external libraries + a constructor in the impl trip the default
    // validations; forceImport only records layout, so allow them.
    unsafeAllow: ['constructor', 'external-library-linking'],
  });

  console.log('Done. The chain-' + chainId.toString() + ' OZ manifest now registers this proxy.');
  console.log('Commit the new .openzeppelin/*.json so this does not recur.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
