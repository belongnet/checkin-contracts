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
    polygon: createLedgerConnect(ChainIds.polygon, ledgerAccounts, process.env.INFURA_ID_PROJECT),
    blast: createLedgerConnect(ChainIds.blast, ledgerAccounts),
    celo: createLedgerConnect(ChainIds.celo, ledgerAccounts),
    base: createLedgerConnect(ChainIds.base, ledgerAccounts),
    linea: createLedgerConnect(ChainIds.linea, ledgerAccounts),
    skale_europa: createLedgerConnect(ChainIds.skale_europa, ledgerAccounts),
    skale_nebula: createLedgerConnect(ChainIds.skale_nebula, ledgerAccounts),
    skale_calypso: createLedgerConnect(ChainIds.skale_calypso, ledgerAccounts),
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
      blast: process.env.BLASTSCAN_API_KEY! || '',
      polygon: process.env.POLYSCAN_API_KEY || '',
      celo: process.env.CELOSCAN_API_KEY || '',
      base: process.env.BASESCAN_API_KEY || '',
      linea: process.env.LINEASCAN_API_KEY || '',
      skale_europa: 'skale_europa', // Is not required by blockscout. Can be any non-empty string
      skale_nebula: 'skale_nebula', // Is not required by blockscout. Can be any non-empty string
      skale_calypso: 'skale_calypso', // Is not required by blockscout. Can be any non-empty string
      sepolia: process.env.ETHERSCAN_API_KEY! || '',
      amoy: process.env.POLYSCAN_API_KEY || '',
      blast_sepolia: process.env.BLASTSCAN_API_KEY! || '',
      skale_calypso_testnet: "skale_calypso_testnet", // Is not required by blockscout. Can be any non-empty string
    },
    customChains: [
      {
        network: "blast",
        chainId: ChainIds.blast,
        urls: {
          apiURL: "https://api.blastscan.io/api",
          browserURL: "https://blastscan.io/",
        },
      },
      {
        network: "celo",
        chainId: ChainIds.celo,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io/",
        },
      },
      {
        network: "base",
        chainId: ChainIds.base,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org/",
        },
      },
      {
        network: "linea",
        chainId: ChainIds.linea,
        urls: {
          apiURL: "https://api.lineascan.build/api",
          browserURL: "https://lineascan.build/",
        },
      },
      {
        network: "skale_europa",
        chainId: ChainIds.skale_europa,
        urls: {
          apiURL:
            "https://elated-tan-skat.explorer.mainnet.skalenodes.com/api",
          browserURL:
            "https://elated-tan-skat.explorer.mainnet.skalenodes.com/",
        },
      },
      {
        network: "skale_nebula",
        chainId: ChainIds.skale_nebula,
        urls: {
          apiURL:
            "https://green-giddy-denebola.explorer.mainnet.skalenodes.com/api",
          browserURL:
            "https://green-giddy-denebola.explorer.mainnet.skalenodes.com/",
        },
      },
      {
        network: "skale_calypso",
        chainId: ChainIds.skale_calypso,
        urls: {
          apiURL:
            "https://honorable-steel-rasalhague.explorer.mainnet.skalenodes.com/api",
          browserURL:
            "https://honorable-steel-rasalhague.explorer.mainnet.skalenodes.com/",
        },
      },
      {
        network: "blast_sepolia",
        chainId: ChainIds.blast_sepolia,
        urls: {
          apiURL: "https://api-sepolia.blastscan.io/api",
          browserURL: "https://sepolia.blastscan.io/",
        },
      },
      {
        network: "amoy",
        chainId: ChainIds.amoy,
        urls: {
          apiURL:
            "https://api-amoy.polygonscan.com/api",
          browserURL:
            "https://amoy.polygonscan.com",
        },
      },
      {
        network: "skale_calypso_testnet",
        chainId: ChainIds.skale_calypso_testnet,
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
  },
};

export default config;