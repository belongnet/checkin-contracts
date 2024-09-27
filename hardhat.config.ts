import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "solidity-docgen"
import "@shardlabs/starknet-hardhat-plugin";

import dotenv from "dotenv";
import { ChainIds, createRPClink } from './utils/chainConfig'
dotenv.config();

if (!process.env.PK) {
  throw new Error('Private key (PK) not found in environment variables.');
}
const accounts = [process.env.PK];


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
  starknet: {
    dockerizedVersion: "0.10.3",
    network: "alpha-goerli"
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
    },
    mainnet: createRPClink(ChainIds.mainnet, accounts, process.env.INFURA_ID_PROJECT),
    bsc: createRPClink(ChainIds.bsc, accounts),
    matic: createRPClink(ChainIds.matic, accounts, process.env.INFURA_ID_PROJECT),
    blast: createRPClink(ChainIds.blast, accounts),
    skale: createRPClink(ChainIds.skale, accounts),
    sepolia: createRPClink(ChainIds.sepolia, accounts, process.env.INFURA_ID_PROJECT),
    blast_sepolia: createRPClink(ChainIds.blast_sepolia, accounts),
    skale_calypso_testnet: createRPClink(ChainIds.skale_calypso_testnet, accounts),
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY! || '',
      blast: process.env.BLASTSCAN_API_KEY! || '',
      blast_sepolia: process.env.BLASTSCAN_API_KEY! || '',
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
    ],
  },
  paths: {
    sources: "contracts",
  },
  docgen: {
    outputDir: "./docs/contracts",
    exclude: ['nft-with-royalties/mocks', 'mocks'],
    pages: 'files'
  }
};

export default config;