import { ChainIds, chainRPCs } from "./chain-ids";

interface NetworkConfig {
  url: string;
  chainId: ChainIds;
  accounts: string[];
}

interface NetworkConfig {
  url: string;
  chainId: ChainIds;
  ledgerAccounts: string[];
}

interface CustomChainScanConfig {
  network: string;
  chainId: ChainIds;
  urls: {
    apiURL: string;
    browserURL: string;
  };
}

export function createConnect(
  chainId: ChainIds,
  accounts: string[],
  apiKey?: string
): NetworkConfig {
  if (accounts.length == 0) {
    throw Error("Account private key is not found in environment variables.");
  }

  return {
    url: chainRPCs(chainId, apiKey),
    chainId,
    accounts,
  } as NetworkConfig;
}

export function createLedgerConnect(
  chainId: ChainIds,
  ledgerAccounts: string[],
  apiKey?: string
): NetworkConfig {
  if (ledgerAccounts.length == 0) {
    throw Error("Ledger address not found in environment variables.");
  }

  return {
    url: chainRPCs(chainId, apiKey),
    chainId,
    ledgerAccounts,
  } as NetworkConfig;
}

export const blockscanConfig = (
  network: string,
  chainId: ChainIds
): CustomChainScanConfig => {
  if (
    [ChainIds.mainnet, ChainIds.polygon, ChainIds.sepolia].includes(chainId)
  ) {
    throw Error("Not a custom chain.");
  }

  let browserURL: string;
  let apiURL: string;

  switch (chainId) {
    case ChainIds.blast:
      browserURL = `blastscan.io/`;
      break;
    case ChainIds.celo:
      browserURL = `celoscan.io/`;
      break;
    case ChainIds.base:
      browserURL = `basescan.org/`;
      break;
    case ChainIds.linea:
      browserURL = `lineascan.build/`;
      break;
    case ChainIds.astar:
      browserURL = `arbiscan.io/`;
      break;
    case ChainIds.astar:
      browserURL = `astar.blockscout.com/`;
      break;
    case ChainIds.blast_sepolia:
      browserURL = `sepolia.blastscan.io/`;
      break;
    case ChainIds.amoy:
      browserURL = `amoy.polygonscan.com/`;
      break;
    case ChainIds.skale_europa:
      browserURL = `elated-tan-skat.explorer.mainnet.skalenodes.com/`;
      break;
    case ChainIds.skale_nebula:
      browserURL = `green-giddy-denebola.explorer.mainnet.skalenodes.com/`;
      break;
    case ChainIds.skale_calypso:
      browserURL = `honorable-steel-rasalhague.explorer.mainnet.skalenodes.com/`;
      break;
    case ChainIds.skale_calypso_testnet:
      browserURL = `giant-half-dual-testnet.explorer.testnet.skalenodes.com/`;
      break;
    default:
      throw Error("No networks provided");
  }

  if (
    chainId !== ChainIds.skale_europa &&
    chainId !== ChainIds.skale_nebula &&
    chainId !== ChainIds.skale_calypso &&
    chainId !== ChainIds.skale_calypso_testnet
  ) {
    if (
      [ChainIds.blast_sepolia, ChainIds.amoy, ChainIds.sepolia].includes(
        chainId as ChainIds
      )
    ) {
      apiURL = `https://api-${browserURL}api`;
    } else {
      apiURL = `https://api.${browserURL}api`;
    }
  } else {
    apiURL = `https://${browserURL}api`;
  }

  browserURL = `https://${browserURL}`;

  return {
    network,
    chainId,
    urls: {
      apiURL,
      browserURL,
    },
  };
};
