import hre from 'hardhat';
import { ethers } from 'ethers';

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

function encodeConstructorArgs(abi: any[], args: unknown[]): string {
  if (args.length === 0) return '';
  const ctor = abi.find(item => item.type === 'constructor');
  if (!ctor || !ctor.inputs || ctor.inputs.length === 0) return '';
  return ethers.utils.defaultAbiCoder.encode(ctor.inputs, args).slice(2);
}

function isAlreadyVerified(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes('already verified');
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
  contract: string,
): Promise<void> => {
  console.log(`Trying to verify ${address}`);
  try {
    const chainId = hre.network.config.chainId;
    if (!chainId) throw new Error(`Network "${hre.network.name}" has no chainId`);

    const apiKey = process.env.ETHSCAN_KEY?.trim();
    if (!apiKey) throw new Error('ETHSCAN_KEY missing in .env');

    const buildInfo = await hre.artifacts.getBuildInfo(contract);
    if (!buildInfo) throw new Error(`No build-info found for ${contract}`);

    const artifact = await hre.artifacts.readArtifact(contract);
    // Use the exact long version Hardhat used to compile (avoids accidentally
    // matching nightly builds in the public solc binary list).
    const compilerVersion = `v${buildInfo.solcLongVersion}`;
    const encodedArgs = encodeConstructorArgs(artifact.abi, constructorArguments);

    // V2 requires routing params (chainid, module, action, apikey) in the URL.
    const submitUrl = `${V2_API}?chainid=${chainId}` + `&module=contract&action=verifysourcecode&apikey=${apiKey}`;

    const body = new URLSearchParams({
      contractaddress: address,
      sourceCode: JSON.stringify(buildInfo.input),
      codeformat: 'solidity-standard-json-input',
      contractname: contract,
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
