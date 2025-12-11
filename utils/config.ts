import { CustomChain, EtherscanConfig } from '@nomiclabs/hardhat-etherscan/dist/src/types';
import dotenv from 'dotenv';

import { ChainIds, chainRPCs } from './chain-ids';
import chainConfig from './chain-properties.json';

dotenv.config();

interface NetworkConfig {
  url: string;
  chainId: ChainIds;
  accounts?: string[];
  ledgerAccounts?: string[];
}

type ChainConfig = {
  chainId: number;
  explorer: string;
  api?: string;
};

export function createConnect(chainId: ChainIds, accounts: string[], apiKey?: string): NetworkConfig {
  if (accounts.length == 0) {
    throw Error('Account private key is not found in environment variables.');
  }

  return {
    url: chainRPCs(chainId, apiKey),
    chainId,
    accounts,
    gasPrice: 2000000000,
  } as NetworkConfig;
}

export function createLedgerConnect(chainId: ChainIds, ledgerAccounts: string[], apiKey?: string): NetworkConfig {
  if (ledgerAccounts.length == 0) {
    throw Error('Ledger address not found in environment variables.');
  }

  return {
    url: chainRPCs(chainId, apiKey),
    chainId,
    ledgerAccounts,
  } as NetworkConfig;
}

const allSlugs = Object.keys(chainConfig as Record<string, ChainConfig>);

export function getBlockscanConfig(slug: string, apiVersion: 'v1' | 'v2' = 'v2'): CustomChain {
  const entry = (chainConfig as Record<string, ChainConfig>)[slug];

  if (!entry) {
    throw new Error(`Network '${slug}' not found in chain-properties.json`);
  }

  const { chainId, explorer, api } = entry;

  let apiURL: string;
  if (apiVersion === 'v1') {
    // derive host from api if present, else from explorer
    const source = api ?? explorer;
    try {
      const parsed = new URL(source);
      apiURL = `${parsed.protocol}//${parsed.hostname}/api`;
    } catch {
      apiURL = `https://api.etherscan.io/api`;
    }
  } else {
    apiURL = api ?? `https://api.etherscan.io/v2/api?chainid=${chainId}`;
  }

  return {
    network: slug,
    chainId,
    urls: { apiURL, browserURL: explorer },
  };
}

export const blockscanConfig = (
  slug: string,
  chainId?: ChainIds,
  options?: { apiVersion?: 'v1' | 'v2' },
): CustomChain => {
  const apiVersion = options?.apiVersion ?? 'v2';
  const config = getBlockscanConfig(slug, apiVersion);

  if (chainId && config.chainId !== chainId) {
    throw new Error(`Chain ID mismatch for '${slug}': expected ${chainId}, found ${config.chainId}`);
  }

  return config;
};

export const buildEtherscanConfig = (key: string = process.env.ETHERSCAN_KEY ?? ''): EtherscanConfig => {
  if (!key) {
    throw new Error('Missing ETHERSCAN_KEY in env');
  }

  const apiKey = Object.fromEntries(allSlugs.map(slug => [slug, key]));

  return {
    apiKey,
    customChains: allSlugs.map(getBlockscanConfig),
  };
};
