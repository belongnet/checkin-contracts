import { artifacts, ethers } from 'hardhat';
import type { Artifact } from 'hardhat/types';

import { envFlag } from './env';

/**
 * Lower-cases runtime code and removes its trailing CBOR metadata, whose byte length is encoded in the
 * last two bytes. Code that is too short, or whose metadata length is implausible, is returned with
 * nothing removed.
 */
export function stripMetadata(runtimeCode: string): string {
  const code = runtimeCode.toLowerCase();
  const hexLength = code.startsWith('0x') ? code.length - 2 : code.length;
  const metadataChars = (parseInt(code.slice(-4), 16) + 2) * 2;
  if (hexLength < 4 || Number.isNaN(metadataChars) || metadataChars > hexLength) {
    return code;
  }
  return code.slice(0, code.length - metadataChars);
}

/**
 * The artifact's runtime bytecode with every library placeholder replaced by the address given for that
 * library name: the code the contract has on chain once linked (the contracts here have no immutables).
 */
export function linkedRuntimeBytecode(artifact: Artifact, libraries: Record<string, string>): string {
  let code = artifact.deployedBytecode;
  const prefixLength = code.startsWith('0x') ? 2 : 0;
  for (const sourceLibraries of Object.values(artifact.deployedLinkReferences)) {
    for (const [libraryName, references] of Object.entries(sourceLibraries)) {
      const address = libraries[libraryName];
      if (!address) {
        throw new Error(`${artifact.contractName} links ${libraryName}, but no address was given for that library.`);
      }
      const addressHex = ethers.utils.getAddress(address).slice(2);
      for (const { start, length } of references) {
        // `start` and `length` are byte offsets: two hex characters per byte.
        const from = prefixLength + start * 2;
        code = code.slice(0, from) + addressHex + code.slice(from + length * 2);
      }
    }
  }
  return code;
}

// A library's runtime code starts with PUSH20 (0x73) and its own address: zeros in the artifact, the
// real address on chain. Blank those 20 bytes so that both sides can be compared.
function maskLibrarySelfAddress(runtimeCode: string): string {
  return runtimeCode.startsWith('0x73') ? `0x73${'0'.repeat(40)}${runtimeCode.slice(44)}` : runtimeCode;
}

/**
 * Throws unless the code at `address` is this checkout's build of the library `libraryName`.
 * A contract linked to a library built from other source calls functions that are missing or that
 * behave differently. `ALLOW_LIBRARY_BYTECODE_MISMATCH=true` overrides the comparison, but an address
 * without any code is always refused.
 */
export async function assertLibraryMatchesLocalBuild(libraryName: string, address: string): Promise<void> {
  if (!ethers.utils.isAddress(address)) {
    throw new Error(`The recorded ${libraryName} library address is missing or invalid: ${address}`);
  }
  const artifact = await artifacts.readArtifact(libraryName);
  const liveCode = await ethers.provider.getCode(address);
  if (liveCode === '0x') {
    throw new Error(`The ${libraryName} library recorded at ${address} has no contract code on this chain.`);
  }

  const localBuild = maskLibrarySelfAddress(stripMetadata(artifact.deployedBytecode));
  if (maskLibrarySelfAddress(stripMetadata(liveCode)) === localBuild) {
    return;
  }

  const mismatch = `The library recorded at ${address} was not built from this checkout's ${libraryName} source: linking it would make every call into it fail or behave differently.`;
  if (!envFlag('ALLOW_LIBRARY_BYTECODE_MISMATCH', false)) {
    throw new Error(
      `${mismatch} Deploy ${libraryName} from this checkout first (or set ALLOW_LIBRARY_BYTECODE_MISMATCH=true to override).`,
    );
  }
  console.warn(`WARNING: ${mismatch} Continuing because ALLOW_LIBRARY_BYTECODE_MISMATCH=true.`);
}

type ByteRange = { start: number; length: number };

// Byte ranges of the immutables in the artifact's runtime code, read from the compiler output.
async function immutableRanges(artifact: Artifact): Promise<ByteRange[]> {
  const buildInfo = await artifacts.getBuildInfo(`${artifact.sourceName}:${artifact.contractName}`);
  const references =
    buildInfo?.output.contracts[artifact.sourceName]?.[artifact.contractName]?.evm.deployedBytecode
      .immutableReferences ?? {};
  return Object.values(references).flat();
}

// Replaces the given byte ranges of `code` with zeros.
function maskRanges(code: string, ranges: ByteRange[]): string {
  const prefixLength = code.startsWith('0x') ? 2 : 0;
  let masked = code;
  for (const { start, length } of ranges) {
    const from = prefixLength + start * 2;
    masked = masked.slice(0, from) + '0'.repeat(length * 2) + masked.slice(from + length * 2);
  }
  return masked;
}

/**
 * Throws unless the code at `address` is this checkout's build of `contractName`, linked with
 * `libraries`. Metadata and immutable values are ignored in the comparison.
 * Code built from other source has not been compiled, tested or layout-checked in this checkout.
 * `ALLOW_IMPLEMENTATION_BYTECODE_MISMATCH=true` overrides the comparison, but an address without any
 * code is always refused.
 */
export async function assertContractMatchesLocalBuild(
  contractName: string,
  address: string,
  libraries: Record<string, string> = {},
): Promise<void> {
  if (!ethers.utils.isAddress(address)) {
    throw new Error(`The ${contractName} address is missing or invalid: ${address}`);
  }
  const liveCode = await ethers.provider.getCode(address);
  if (liveCode === '0x') {
    throw new Error(`${contractName} at ${address} has no contract code on this chain.`);
  }

  // Immutables (for example the self address of a UUPS implementation) are zero in the artifact and
  // set on chain, so those bytes are blanked on both sides before comparing.
  const artifact = await artifacts.readArtifact(contractName);
  const immutables = await immutableRanges(artifact);
  const localCode = maskRanges(linkedRuntimeBytecode(artifact, libraries), immutables);
  if (stripMetadata(localCode) === stripMetadata(maskRanges(liveCode, immutables))) {
    return;
  }

  const mismatch = `The code at ${address} was not built from this checkout's ${contractName} source with the recorded libraries.`;
  if (!envFlag('ALLOW_IMPLEMENTATION_BYTECODE_MISMATCH', false)) {
    throw new Error(
      `${mismatch} Deploy ${contractName} from this checkout first (or set ALLOW_IMPLEMENTATION_BYTECODE_MISMATCH=true to override).`,
    );
  }
  console.warn(`WARNING: ${mismatch} Continuing because ALLOW_IMPLEMENTATION_BYTECODE_MISMATCH=true.`);
}
