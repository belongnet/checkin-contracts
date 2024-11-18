import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "solidity-docgen"
import "hardhat-contract-sizer";
import "@nomicfoundation/hardhat-ledger";

import dotenv from "dotenv";
import { createConnect } from './utils/config'
import { createLedgerConnect } from './utils/ledger-config'
import { ChainIds } from "./utils/chain-ids";
dotenv.config();

let accounts: string[] = [], ledgerAccounts: string[] = [];

if (process.env.PK) {
  accounts = [process.env.PK];
}
if (process.env.LEDGER_ADDRESS) {
  ledgerAccounts = [process.env.LEDGER_ADDRESS];
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.27",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
    },
    mainnet: createLedgerConnect(ChainIds.mainnet, ledgerAccounts, process.env.INFURA_ID_PROJECT),
    bsc: createLedgerConnect(ChainIds.bsc, ledgerAccounts),
    matic: createLedgerConnect(ChainIds.matic, ledgerAccounts, process.env.INFURA_ID_PROJECT),
    blast: createLedgerConnect(ChainIds.blast, ledgerAccounts),
    skale: createLedgerConnect(ChainIds.skale, ledgerAccounts),
    sepolia: createConnect(ChainIds.sepolia, accounts, process.env.INFURA_ID_PROJECT),
    blast_sepolia: createConnect(ChainIds.blast_sepolia, accounts),
    skale_calypso_testnet: createConnect(ChainIds.skale_calypso_testnet, accounts),
    amoy: createConnect(ChainIds.amoy, accounts),
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY! || '',
      sepolia: process.env.ETHERSCAN_API_KEY! || '',
      blast: process.env.BLASTSCAN_API_KEY! || '',
      blast_sepolia: process.env.BLASTSCAN_API_KEY! || '',
      amoy: process.env.POLYSCAN_API_KEY || '',
      skale_calypso_testnet: "abc", // Is not required by blockscout. Can be any non-empty string
    },
    customChains: [
      {
        network: "blast",
        chainId: 81457,
        urls: {
          apiURL: "https://api.blastscan.io/api",
          browserURL: "https://blastscan.io/",
        },
      },
      {
        network: "blast_sepolia",
        chainId: 168587773,
        urls: {
          apiURL: "https://api-sepolia.blastscan.io/api",
          browserURL: "https://sepolia.blastscan.io/",
        },
      },
      {
        network: "skale_calypso_testnet",
        chainId: 974399131,
        urls: {
          apiURL:
            "https://giant-half-dual-testnet.explorer.testnet.skalenodes.com/api",
          browserURL:
            "https://giant-half-dual-testnet.explorer.testnet.skalenodes.com/",
        },
      },
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          apiURL:
            "https://api-amoy.polygonscan.com/api",
          browserURL:
            "https://amoy.polygonscan.com",
        },
      },
    ],
  },
  paths: {
    sources: "contracts",
  },
  docgen: {
    outputDir: "./docs/contracts",
    exclude: ['nft-with-royalties/mocks', 'mocks'],
    pages: 'files'
  },
};

export default config;