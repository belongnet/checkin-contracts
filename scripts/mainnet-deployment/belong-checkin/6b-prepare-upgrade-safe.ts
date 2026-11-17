// Generic version of 6-prepare-checkin-upgrade-safe.ts for the transparent proxies whose ProxyAdmin is
// owned by a Safe: deploys (or reuses) a new implementation and prints the Safe transaction that
// upgrades the proxy to it. It never calls the proxy or the ProxyAdmin itself.
//
// TARGET (required): Factory | Staking | BelongCheckIn
// Optional: DEPLOY (default true), IMPLEMENTATION_ADDRESS (reuse an implementation that is already
//   deployed), VERIFY (default false), SKIP_LAYOUT_VALIDATION, EXPECT_LIBRARY_CHANGES,
//   EXPECTED_PROXY_ADMIN_OWNER, ALLOW_LIBRARY_BYTECODE_MISMATCH.
//
// Usage:
//   TARGET=Factory npx hardhat run \
//     scripts/mainnet-deployment/belong-checkin/6b-prepare-upgrade-safe.ts --network <net>

import { ethers, upgrades } from 'hardhat';

import { assertLibraryMatchesLocalBuild } from '../../helpers/bytecode';
import { envFlag } from '../../helpers/env';
import {
  assertImplementationUsable,
  assertRecordMatchesLiveLinkage,
  DeploymentRecord,
  LibraryAddresses,
  parseUpgradeTarget,
  readLiveImplementation,
  readProxyAdmin,
  recordedUpgradeTarget,
  UpgradeTarget,
} from '../../helpers/upgrade-preflight';
import { verifyContract } from '../../helpers/verify-contract';

import fs from 'fs';

const DEPLOY = envFlag('DEPLOY', true);
const VERIFY = envFlag('VERIFY', false);
const SKIP_LAYOUT_VALIDATION = envFlag('SKIP_LAYOUT_VALIDATION', false);

type PendingUpgrade = {
  proxy: string;
  proxyAdmin: string;
  proxyAdminOwner: string;
  implementation: string;
  libraries: LibraryAddresses;
  data: string;
};

// What a target already records about its implementation; only the addresses are read back.
type RecordedImplementation = { implementation?: unknown; pendingUpgrade?: { implementation?: unknown } };

type DeploymentJson = DeploymentRecord & {
  factory?: RecordedImplementation;
  checkIn?: RecordedImplementation;
  stakingPendingUpgrade?: { implementation?: unknown };
};

// The implementation recorded by an earlier run (a pending upgrade first), used when nothing is deployed now.
function recordedImplementation(deployments: DeploymentJson, target: UpgradeTarget): unknown {
  if (target === 'Staking') {
    return deployments.stakingPendingUpgrade?.implementation;
  }
  const recorded = target === 'Factory' ? deployments.factory : deployments.checkIn;
  return recorded?.pendingUpgrade?.implementation ?? recorded?.implementation;
}

// Staking is recorded as a plain address string, so its pending upgrade lives in a top-level key.
function storePendingUpgrade(deployments: DeploymentJson, target: UpgradeTarget, record: PendingUpgrade): void {
  if (target === 'Factory') {
    deployments.factory = { ...deployments.factory, pendingUpgrade: record };
  } else if (target === 'BelongCheckIn') {
    deployments.checkIn = { ...deployments.checkIn, pendingUpgrade: record };
  } else {
    deployments.stakingPendingUpgrade = record;
  }
}

async function main() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentFile = `deployments/chainId-${chainId}.json`;

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }

  const deployments: DeploymentJson = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  const target = parseUpgradeTarget(process.env.TARGET);
  const { contractName, proxy, libraries } = recordedUpgradeTarget(deployments, target, deploymentFile);
  const libraryNames = Object.keys(libraries);

  // What is live, and who can upgrade it.
  const { liveImplementation, liveCode } = await readLiveImplementation(proxy, contractName, chainId);
  const { proxyAdmin, proxyAdminOwner, proxyAdminOwnerHasCode } = await readProxyAdmin(proxy);
  console.log('Target:             ', contractName);
  console.log('Proxy:              ', proxy);
  console.log('Live implementation:', liveImplementation);
  console.log('ProxyAdmin:         ', proxyAdmin);
  console.log('ProxyAdmin owner:   ', proxyAdminOwner);
  console.log('Owner has code:     ', proxyAdminOwnerHasCode ? 'yes' : 'no');
  if (!proxyAdminOwnerHasCode) {
    console.warn(
      `WARNING: ProxyAdmin owner ${proxyAdminOwner} has no contract code, so it is not a Safe: only that key can send the upgrade.`,
    );
  }

  // The record must describe what is live, and the libraries to link must be this checkout's builds.
  if (libraryNames.length > 0) {
    assertRecordMatchesLiveLinkage({
      label: contractName,
      liveImplementation,
      liveCode,
      libraries,
      deploymentFile,
    });
    for (const name of libraryNames) {
      await assertLibraryMatchesLocalBuild(name, libraries[name]);
    }
  }

  // Storage layout of the new build against the live implementation.
  const ImplFactory = await ethers.getContractFactory(contractName, { libraries });
  if (SKIP_LAYOUT_VALIDATION) {
    console.warn('WARNING: SKIP_LAYOUT_VALIDATION=true: the storage layout was NOT checked against the live code.');
  } else {
    try {
      await upgrades.validateUpgrade(proxy, ImplFactory, {
        kind: 'transparent',
        unsafeAllow: ['constructor'],
        unsafeAllowLinkedLibraries: true,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('is not registered')) {
        throw new Error(
          `${error.message}\nRegister the ${contractName} proxy in the OpenZeppelin manifest first: run 6a-force-import-checkin.ts with TARGET=${target} from the commit that is live.`,
          { cause: error },
        );
      }
      throw error;
    }
    console.log('Storage layout:      compatible with the live implementation');
  }

  // The implementation to propose: an explicit override, a fresh deployment, or the one already recorded.
  const implementationOverride = process.env.IMPLEMENTATION_ADDRESS?.trim();
  let candidate: unknown = implementationOverride || recordedImplementation(deployments, target);
  if (DEPLOY && !implementationOverride) {
    console.log(`Deploying new ${contractName} implementation...`);
    const implementationContract = await ImplFactory.deploy();
    await implementationContract.deployed();
    candidate = implementationContract.address;
    console.log(`Deployed ${contractName} implementation to: `, candidate);
  }
  if (typeof candidate !== 'string' || !ethers.utils.isAddress(candidate)) {
    throw new Error(
      `No valid ${contractName} implementation address: set IMPLEMENTATION_ADDRESS or run with DEPLOY=true.`,
    );
  }
  const implementation = ethers.utils.getAddress(candidate);

  await assertImplementationUsable({
    label: contractName,
    implementation,
    liveImplementation,
    proxy,
    libraries,
    chainId,
  });

  const proxyAdminInterface = new ethers.utils.Interface(['function upgrade(address proxy, address implementation)']);
  const data = proxyAdminInterface.encodeFunctionData('upgrade', [proxy, implementation]);

  storePendingUpgrade(deployments, target, { proxy, proxyAdmin, proxyAdminOwner, implementation, libraries, data });
  fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));

  console.log('');
  console.log('Safe transaction fields:');
  console.log('To:   ', proxyAdmin);
  console.log('Value:', '0');
  console.log('Data: ', data);
  console.log('');
  console.log('ProxyAdmin owner:   ', proxyAdminOwner);
  console.log('Live implementation:', liveImplementation);
  console.log('New implementation: ', implementation);

  if (VERIFY) {
    await verifyContract(implementation);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
