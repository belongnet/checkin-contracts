import { ethers, upgrades } from 'hardhat';

import { assertLibraryMatchesLocalBuild } from '../../helpers/bytecode';
import { envFlag } from '../../helpers/env';
import {
  assertImplementationUsable,
  assertRecordMatchesLiveLinkage,
  LibraryAddresses,
  readLiveImplementation,
  readProxyAdmin,
} from '../../helpers/upgrade-preflight';
import { verifyContract } from '../../helpers/verify-contract';

import fs from 'fs';

const DEPLOY = envFlag('DEPLOY', true);
const VERIFY = envFlag('VERIFY', false);

async function main() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentsDir = 'deployments';
  const deploymentFile = `${deploymentsDir}/chainId-${chainId}.json`;

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
      `Missing required deployment data:\nBelongCheckIn proxy: ${proxy}\nSignatureVerifier: ${signatureVerifier}\nHelper: ${helper}\nDualDexSwapV4Lib: ${dualDexSwapV4Lib}`,
    );
  }

  // Preflight (read-only, runs before anything is deployed): the record must describe what is live.
  const recordedLibraries: LibraryAddresses = {
    SignatureVerifier: signatureVerifier,
    Helper: helper,
    DualDexSwapV4Lib: dualDexSwapV4Lib,
  };
  for (const [name, address] of Object.entries(recordedLibraries)) {
    if (!ethers.utils.isAddress(address)) {
      throw new Error(`Recorded ${name} library address is invalid: ${address}`);
    }
    if ((await ethers.provider.getCode(address)) === '0x') {
      throw new Error(`Recorded ${name} library ${address} has no contract code on chain ${chainId}.`);
    }
  }

  const { liveImplementation, liveCode } = await readLiveImplementation(proxy, 'CheckIn', chainId);
  assertRecordMatchesLiveLinkage({
    label: 'CheckIn',
    liveImplementation,
    liveCode,
    libraries: recordedLibraries,
    deploymentFile,
  });
  const { proxyAdmin, proxyAdminOwner, proxyAdminOwnerHasCode } = await readProxyAdmin(proxy);

  // The new implementation is linked to the recorded libraries, so they must be this checkout's builds.
  for (const [name, address] of Object.entries(recordedLibraries)) {
    await assertLibraryMatchesLocalBuild(name, address);
  }

  const BelongCheckIn = await ethers.getContractFactory('BelongCheckIn', {
    libraries: {
      SignatureVerifier: signatureVerifier,
      Helper: helper,
      DualDexSwapV4Lib: dualDexSwapV4Lib,
    },
  });

  await upgrades.validateUpgrade(proxy, BelongCheckIn, {
    kind: 'transparent',
    unsafeAllow: ['constructor'],
    unsafeAllowLinkedLibraries: true,
  });

  let implementation =
    process.env.CHECKIN_IMPLEMENTATION_ADDRESS ??
    deployments.checkIn?.pendingUpgrade?.implementation ??
    deployments.checkIn?.implementation;

  if (DEPLOY && !process.env.CHECKIN_IMPLEMENTATION_ADDRESS) {
    console.log('Deploying new BelongCheckIn implementation...');
    const implementationContract = await BelongCheckIn.deploy();
    await implementationContract.deployed();
    implementation = implementationContract.address;
    console.log('Deployed BelongCheckIn implementation to: ', implementation);
  }

  if (!implementation || !ethers.utils.isAddress(implementation)) {
    throw new Error(`Invalid CheckIn implementation address: ${implementation}`);
  }

  // The chosen implementation must exist, change something, and be linked to the recorded libraries.
  await assertImplementationUsable({
    label: 'CheckIn',
    contractName: 'BelongCheckIn',
    implementation,
    liveImplementation,
    proxy,
    libraries: recordedLibraries,
    chainId,
  });

  const proxyAdminInterface = new ethers.utils.Interface(['function upgrade(address proxy, address implementation)']);
  const data = proxyAdminInterface.encodeFunctionData('upgrade', [proxy, implementation]);

  deployments.checkIn.pendingUpgrade = {
    proxy,
    proxyAdmin,
    proxyAdminOwner,
    implementation,
    dualDexSwapV4Lib,
    data,
  };
  fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));

  console.log('Safe transaction fields:');
  console.log('To:   ', proxyAdmin);
  console.log('Value:', '0');
  console.log('Data: ', data);
  console.log('');
  console.log('Proxy:              ', proxy);
  console.log('ProxyAdmin owner:   ', proxyAdminOwner);
  console.log('Owner has code:     ', proxyAdminOwnerHasCode ? 'yes' : 'no');
  console.log('Live implementation:', liveImplementation);
  console.log('New implementation: ', implementation);
  console.log('DualDexSwapV4Lib:   ', dualDexSwapV4Lib);
  if (!proxyAdminOwnerHasCode) {
    console.warn(
      `WARNING: ProxyAdmin owner ${proxyAdminOwner} has no contract code, so it is not a Safe: only that key can send the transaction above.`,
    );
  }

  if (VERIFY) {
    await verifyContract(implementation);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
