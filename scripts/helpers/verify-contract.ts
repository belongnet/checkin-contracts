import hre from 'hardhat';
import { ethers } from 'ethers';
import { Artifact } from 'hardhat/types';

/*
 * Direct Etherscan V2 verifier — bypasses @nomiclabs/hardhat-etherscan, which
 * still calls the deprecated V1 endpoints. Etherscan's V2 unified API:
 *
 *   https://api.etherscan.io/v2/api?chainid=<id>&module=contract&action=verifysourcecode
 *
 * Works with a single ETHSCAN_KEY across every supported chain.
 */
const V2_API = 'https://api.etherscan.io/v2/api';
const POLL_INTERVAL_MS = 5_000;
const POLL_MAX_ATTEMPTS = 30;

interface EtherscanResponse {
  status: string;
  message: string;
  result: string;
}

interface VerificationTarget {
  artifact: Artifact;
  buildInfoContractName: string;
}

function encodeConstructorArgs(abi: any[], args: unknown[]): string {
  if (args.length === 0) return '';
  const ctor = abi.find(item => item.type === 'constructor');
  if (!ctor || !ctor.inputs || ctor.inputs.length === 0) return '';
  return ethers.utils.defaultAbiCoder.encode(ctor.inputs, args).slice(2);
}

function getApiKey(): string {
  const apiKey = process.env.ETHSCAN_KEY ?? process.env.ETHERSCAN_API_KEY ?? process.env.BSCSCAN_API_KEY ?? '';
  if (!apiKey.trim()) {
    throw new Error('Missing explorer API key. Set ETHSCAN_KEY, ETHERSCAN_API_KEY, or BSCSCAN_API_KEY in .env');
  }
  return apiKey.trim();
}

function isAlreadyVerified(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes('already verified');
}

function normalizeBytecode(bytecode: string): string {
  return bytecode.replace(/^0x/, '').toLowerCase();
}

function bytecodeMatches(artifactBytecode: string, deployedBytecode: string): boolean {
  let artifact = normalizeBytecode(artifactBytecode);
  const deployed = normalizeBytecode(deployedBytecode);

  if (artifact.length !== deployed.length) return false;
  if (artifact.startsWith(`73${'0'.repeat(40)}30`) && /^73[0-9a-f]{40}30/.test(deployed)) {
    artifact = `73${deployed.slice(2, 42)}${artifact.slice(42)}`;
  }
  if (!artifact.includes('__$')) return artifact === deployed;

  const placeholder = /__\$[0-9a-f]{34}\$__/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = placeholder.exec(artifact)) !== null) {
    const start = match.index;
    if (deployed.slice(cursor, start) !== artifact.slice(cursor, start)) return false;
    if (!/^[0-9a-f]{40}$/.test(deployed.slice(start, start + match[0].length))) return false;
    cursor = start + match[0].length;
  }

  return deployed.slice(cursor) === artifact.slice(cursor);
}

function toFullyQualifiedName(artifact: Artifact): string {
  return `${artifact.sourceName}:${artifact.contractName}`;
}

async function readTarget(contract: string): Promise<VerificationTarget> {
  const artifact = await hre.artifacts.readArtifact(contract);
  return {
    artifact,
    buildInfoContractName: toFullyQualifiedName(artifact),
  };
}

async function resolveTarget(address: string, contract?: string): Promise<VerificationTarget> {
  if (contract) return readTarget(contract);

  const deployedBytecode = await hre.ethers.provider.getCode(address);
  if (deployedBytecode === '0x') {
    throw new Error(`No contract bytecode found at ${address} on network "${hre.network.name}"`);
  }

  const matches: VerificationTarget[] = [];
  const fullyQualifiedNames = await hre.artifacts.getAllFullyQualifiedNames();

  for (const fullyQualifiedName of fullyQualifiedNames) {
    const artifact = await hre.artifacts.readArtifact(fullyQualifiedName);
    if (!artifact.deployedBytecode || artifact.deployedBytecode === '0x') continue;
    if (bytecodeMatches(artifact.deployedBytecode, deployedBytecode)) {
      matches.push({
        artifact,
        buildInfoContractName: fullyQualifiedName,
      });
    }
  }

  if (matches.length === 1) return matches[0];

  if (matches.length > 1) {
    throw new Error(
      `Multiple artifacts match ${address}: ${matches
        .map(match => match.buildInfoContractName)
        .join(', ')}. Pass the contract name explicitly.`,
    );
  }

  throw new Error(`No local artifact bytecode matches ${address}. Pass the fully-qualified contract name explicitly.`);
}

async function pollStatus(chainId: number, guid: string, apiKey: string): Promise<void> {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const url = `${V2_API}?chainid=${chainId}&module=contract&action=checkverifystatus&guid=${guid}&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = (await res.json()) as EtherscanResponse;

    if (data.result === 'Pending in queue') continue;
    if (data.result?.startsWith('Pass')) return;
    if (isAlreadyVerified(data.result ?? '')) return;
    throw new Error(`Verification failed: ${data.result || data.message}`);
  }
  throw new Error('Verification timed out waiting for status');
}

export const verifyContract = async (
  address: string,
  constructorArguments: Array<unknown> = [],
  contract?: string,
): Promise<void> => {
  console.log(`Trying to verify ${address}`);
  try {
    const chainId = hre.network.config.chainId;
    if (!chainId) throw new Error(`Network "${hre.network.name}" has no chainId`);

    const apiKey = getApiKey();
    const target = await resolveTarget(address, contract);

    const buildInfo = await hre.artifacts.getBuildInfo(target.buildInfoContractName);
    if (!buildInfo) throw new Error(`No build-info found for ${target.buildInfoContractName}`);

    // Use the exact long version Hardhat used to compile (avoids accidentally
    // matching nightly builds in the public solc binary list).
    const compilerVersion = `v${buildInfo.solcLongVersion}`;
    const encodedArgs = encodeConstructorArgs(target.artifact.abi, constructorArguments);

    // V2 requires routing params (chainid, module, action, apikey) in the URL.
    const submitUrl = `${V2_API}?chainid=${chainId}` + `&module=contract&action=verifysourcecode&apikey=${apiKey}`;

    const body = new URLSearchParams({
      contractaddress: address,
      sourceCode: JSON.stringify(buildInfo.input),
      codeformat: 'solidity-standard-json-input',
      contractname: target.buildInfoContractName,
      compilerversion: compilerVersion,
      constructorArguements: encodedArgs,
    });

    const submitRes = await fetch(submitUrl, { method: 'POST', body });
    const submitJson = (await submitRes.json()) as EtherscanResponse;

    if (submitJson.status !== '1') {
      if (isAlreadyVerified(submitJson.result ?? '') || isAlreadyVerified(submitJson.message ?? '')) {
        console.log('Contract is already verified');
        return;
      }
      throw new Error(`Verification submit failed: ${submitJson.result || submitJson.message}`);
    }

    const guid = submitJson.result;
    console.log(`Submitted, GUID ${guid}. Polling status...`);
    await pollStatus(chainId, guid, apiKey);
    console.log('Successfully verified!');
  } catch (err) {
    if (err instanceof Error && isAlreadyVerified(err.message)) {
      console.log('Contract is already verified');
      return;
    }
    console.log('Verification failed!!!');
    throw err;
  }
};
