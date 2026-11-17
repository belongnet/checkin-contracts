import { ethers, upgrades } from 'hardhat';

/** Library name -> recorded address, in the order the libraries are reported. */
export type LibraryAddresses = Record<string, string>;

export const UPGRADE_TARGETS = ['Factory', 'Staking', 'BelongCheckIn'] as const;
export type UpgradeTarget = (typeof UPGRADE_TARGETS)[number];

/** The parts of deployments/chainId-<id>.json that locate an upgradeable target. */
export type DeploymentRecord = {
  factory?: { proxy?: unknown };
  tokens?: { staking?: unknown };
  checkIn?: { address?: unknown };
  libraries?: { signatureVerifier?: unknown; helper?: unknown; dualDexSwapV4Lib?: unknown };
};

export type RecordedUpgradeTarget = {
  contractName: string;
  proxy: string;
  libraries: LibraryAddresses;
};

export type ProxyAdminInfo = {
  proxyAdmin: string;
  proxyAdminOwner: string;
  proxyAdminOwnerHasCode: boolean;
};

/** Parses the TARGET env value; an unset or empty value falls back to `defaultTarget` when one is given. */
export function parseUpgradeTarget(value: string | undefined, defaultTarget?: UpgradeTarget): UpgradeTarget {
  const name = value?.trim() ?? '';
  if (name === '' && defaultTarget !== undefined) {
    return defaultTarget;
  }
  const target = UPGRADE_TARGETS.find(candidate => candidate === name);
  if (target === undefined) {
    throw new Error(`TARGET must be one of: ${UPGRADE_TARGETS.join(', ')}.`);
  }
  return target;
}

/** Contract name, proxy address and linked libraries of `target`, as recorded in the deployment file. */
export function recordedUpgradeTarget(
  deployments: DeploymentRecord,
  target: UpgradeTarget,
  deploymentFile: string,
): RecordedUpgradeTarget {
  const recorded = (value: unknown, field: string): string => {
    if (typeof value !== 'string' || !ethers.utils.isAddress(value)) {
      throw new Error(`Missing or invalid ${field} in ${deploymentFile}.`);
    }
    return value;
  };
  const libraries = deployments.libraries;

  if (target === 'Factory') {
    return {
      contractName: 'Factory',
      proxy: recorded(deployments.factory?.proxy, 'factory.proxy'),
      libraries: { SignatureVerifier: recorded(libraries?.signatureVerifier, 'libraries.signatureVerifier') },
    };
  }
  if (target === 'Staking') {
    return { contractName: 'Staking', proxy: recorded(deployments.tokens?.staking, 'tokens.staking'), libraries: {} };
  }
  return {
    contractName: 'BelongCheckIn',
    proxy: recorded(deployments.checkIn?.address, 'checkIn.address'),
    libraries: {
      SignatureVerifier: recorded(libraries?.signatureVerifier, 'libraries.signatureVerifier'),
      Helper: recorded(libraries?.helper, 'libraries.helper'),
      DualDexSwapV4Lib: recorded(libraries?.dualDexSwapV4Lib, 'libraries.dualDexSwapV4Lib'),
    },
  };
}

// A linked library appears in runtime code as its raw 20-byte address.
export function isLinkedTo(runtimeCode: string, libraryAddress: string): boolean {
  return runtimeCode.toLowerCase().includes(ethers.utils.getAddress(libraryAddress).slice(2).toLowerCase());
}

// Names of the libraries whose recorded address does not appear in `runtimeCode`.
export function unlinkedLibraries(runtimeCode: string, libraries: LibraryAddresses): string[] {
  return Object.keys(libraries).filter(name => !isLinkedTo(runtimeCode, libraries[name]));
}

export function describeLibraries(names: string[], libraries: LibraryAddresses): string {
  return names.map(name => `${name} (${libraries[name]})`).join(', ') || 'none';
}

// Libraries the operator declares this upgrade relinks, e.g. EXPECT_LIBRARY_CHANGES=DualDexSwapV4Lib.
export function expectedLibraryChanges(value: string | undefined, libraryNames: string[]): string[] {
  const names = (value ?? '')
    .split(',')
    .map(name => name.trim())
    .filter(name => name !== '');
  const unknownName = names.find(name => !libraryNames.includes(name));
  if (unknownName !== undefined) {
    throw new Error(
      `Unknown library "${unknownName.slice(0, 20)}" in EXPECT_LIBRARY_CHANGES. Accepted names: ${libraryNames.join(', ')}.`,
    );
  }
  return libraryNames.filter(name => names.includes(name));
}

/** Reads the proxy's live implementation and its runtime code. `label` names the contract in messages. */
export async function readLiveImplementation(
  proxy: string,
  label: string,
  chainId: number,
): Promise<{ liveImplementation: string; liveCode: string }> {
  const liveImplementation = await upgrades.erc1967.getImplementationAddress(proxy);
  const liveCode = await ethers.provider.getCode(liveImplementation);
  if (liveCode === '0x') {
    throw new Error(`Live ${label} implementation ${liveImplementation} has no contract code on chain ${chainId}.`);
  }
  return { liveImplementation, liveCode };
}

/**
 * The libraries the live implementation is NOT linked to must be exactly the ones named in
 * EXPECT_LIBRARY_CHANGES: anything else means the record is stale or a relink was not declared.
 */
export function assertRecordMatchesLiveLinkage(options: {
  label: string;
  liveImplementation: string;
  liveCode: string;
  libraries: LibraryAddresses;
  deploymentFile: string;
}): void {
  const { label, liveImplementation, liveCode, libraries, deploymentFile } = options;
  const notLinked = unlinkedLibraries(liveCode, libraries);
  const expectedChanges = expectedLibraryChanges(process.env.EXPECT_LIBRARY_CHANGES, Object.keys(libraries));
  if (notLinked.join(',') === expectedChanges.join(',')) {
    return;
  }

  const remedy =
    notLinked.length > 0
      ? `For an intentional relink set EXPECT_LIBRARY_CHANGES=${notLinked.join(',')} (the exact list) and re-run; otherwise correct ${deploymentFile} first.`
      : 'The live implementation is linked to every recorded library, so unset EXPECT_LIBRARY_CHANGES and re-run.';
  throw new Error(
    `The deployment record lists libraries that the live ${label} implementation ${liveImplementation} is not linked to: ${describeLibraries(notLinked, libraries)}.\n` +
      `EXPECT_LIBRARY_CHANGES declares: ${expectedChanges.join(',') || 'none'}.\n` +
      `Either the record is stale, or this upgrade intentionally relinks those libraries. ${remedy}`,
  );
}

/** Reads the proxy's ProxyAdmin and its owner, and enforces EXPECTED_PROXY_ADMIN_OWNER when it is set. */
export async function readProxyAdmin(proxy: string): Promise<ProxyAdminInfo> {
  const proxyAdmin = await upgrades.erc1967.getAdminAddress(proxy);
  const proxyAdminContract = new ethers.Contract(
    proxyAdmin,
    ['function owner() view returns (address)'],
    ethers.provider,
  );
  const proxyAdminOwner: string = await proxyAdminContract.owner();
  const expectedProxyAdminOwner = process.env.EXPECTED_PROXY_ADMIN_OWNER?.trim();
  if (expectedProxyAdminOwner && expectedProxyAdminOwner.toLowerCase() !== proxyAdminOwner.toLowerCase()) {
    throw new Error(
      `ProxyAdmin ${proxyAdmin} is owned by ${proxyAdminOwner}, which does not match EXPECTED_PROXY_ADMIN_OWNER.`,
    );
  }
  const proxyAdminOwnerHasCode = (await ethers.provider.getCode(proxyAdminOwner)) !== '0x';
  return { proxyAdmin, proxyAdminOwner, proxyAdminOwnerHasCode };
}

/** The implementation to propose must exist, change something, and be linked to the recorded libraries. */
export async function assertImplementationUsable(options: {
  label: string;
  implementation: string;
  liveImplementation: string;
  proxy: string;
  libraries: LibraryAddresses;
  chainId: number;
}): Promise<void> {
  const { label, implementation, liveImplementation, proxy, libraries, chainId } = options;
  const implementationCode = await ethers.provider.getCode(implementation);
  if (implementationCode === '0x') {
    throw new Error(`${label} implementation ${implementation} has no contract code on chain ${chainId}.`);
  }
  if (ethers.utils.getAddress(implementation) === ethers.utils.getAddress(liveImplementation)) {
    throw new Error(
      `${label} implementation ${implementation} is already the live implementation of ${proxy}: the upgrade would be a no-op.`,
    );
  }
  const unlinked = unlinkedLibraries(implementationCode, libraries);
  if (unlinked.length > 0) {
    throw new Error(
      `${label} implementation ${implementation} is not linked to the recorded libraries: ${describeLibraries(unlinked, libraries)}.`,
    );
  }
}
