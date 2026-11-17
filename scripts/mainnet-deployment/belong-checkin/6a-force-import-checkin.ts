import { artifacts, ethers, upgrades } from 'hardhat';

import { linkedRuntimeBytecode, stripMetadata } from '../../helpers/bytecode';
import { envFlag } from '../../helpers/env';
import { parseUpgradeTarget, recordedUpgradeTarget } from '../../helpers/upgrade-preflight';

import fs from 'fs';

const ALLOW_BYTECODE_MISMATCH = envFlag('ALLOW_BYTECODE_MISMATCH', false);

// Registers an already-deployed proxy into the local
// .openzeppelin/<network>.json manifest so that prepare/upgrade scripts can
// run. Non-destructive: deploys nothing and sends no proxy-mutating tx.
// TARGET selects the proxy: BelongCheckIn (default), Factory or Staking.
async function main() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentFile = `deployments/chainId-${chainId}.json`;

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  const target = parseUpgradeTarget(process.env.TARGET, 'BelongCheckIn');
  const { contractName, proxy, libraries } = recordedUpgradeTarget(deployments, target, deploymentFile);

  const ImplFactory = await ethers.getContractFactory(contractName, { libraries });

  const liveImpl = await upgrades.erc1967.getImplementationAddress(proxy);
  const admin = await upgrades.erc1967.getAdminAddress(proxy);
  console.log(`chainId:            ${chainId.toString()}`);
  console.log(`target:             ${contractName}`);
  console.log(`proxy:              ${proxy}`);
  console.log(`live implementation:${liveImpl}`);
  console.log(`proxy admin:        ${admin}`);

  // forceImport records the storage layout of the LOCAL build for the live implementation, so the
  // local build must be the code that is live. None of the targets has immutables, so once the
  // libraries are linked only the metadata hash may differ.
  const localCode = linkedRuntimeBytecode(await artifacts.readArtifact(contractName), libraries);
  const liveCode = await ethers.provider.getCode(liveImpl);
  if (stripMetadata(localCode) !== stripMetadata(liveCode)) {
    const mismatch = `The local ${contractName} source differs from the live implementation ${liveImpl}: the local build, linked with the libraries recorded in ${deploymentFile}, does not match its runtime code. Importing it would record the wrong storage layout; run this import from the commit that was deployed.`;
    if (!ALLOW_BYTECODE_MISMATCH) {
      throw new Error(`${mismatch} Set ALLOW_BYTECODE_MISMATCH=true only if the storage layouts are known to match.`);
    }
    console.warn(`WARNING: ${mismatch} Continuing because ALLOW_BYTECODE_MISMATCH=true.`);
  }

  console.log('Registering proxy in the .openzeppelin manifest via forceImport...');

  // ForceImportOptions (hardhat-upgrades 1.28.0) only declares `kind`; cast so the same object is still passed.
  const forceImportOptions = {
    kind: 'transparent',
    // Linked external libraries + a constructor in the impl trip the default
    // validations; forceImport only records layout, so allow them.
    unsafeAllow: ['constructor', 'external-library-linking'],
  } as Parameters<typeof upgrades.forceImport>[2];
  await upgrades.forceImport(proxy, ImplFactory, forceImportOptions);

  console.log('Done. The chain-' + chainId.toString() + ' OZ manifest now registers this proxy.');
  console.log('Commit the new .openzeppelin/*.json so this does not recur.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
