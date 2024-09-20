import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-docgen"
import dotenv from "dotenv";
dotenv.config();

const mainnetURL = `https://mainnet.infura.io/v3/${process.env.INFURA_ID_PROJECT}`;
const bscURL = "https://bsc-dataseed.binance.org";
const maticURL = `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_ID_PROJECT}`;
const sepoliaURL = `https://sepolia.infura.io/v3/${process.env.INFURA_ID_PROJECT}`;
const blastURL = `https://rpc.envelop.is/blast`;
const blastSepoliaURL = `https://sepolia.blast.io`;
const skaleEuropaURL = `https://mainnet.skalenodes.com/v1/elated-tan-skat`;
const skaleCalypsoTestURL =
  "https://testnet.skalenodes.com/v1/giant-half-dual-testnet";

const accounts = [process.env.PK!];

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.25",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          // metadata: {
          //   // do not include the metadata hash, since this is machine dependent
          //   // and we want all generated code to be deterministic
          //   // https://docs.soliditylang.org/en/v0.7.6/metadata.html
          //   bytecodeHash: "none",
          // },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
    },
    mainnet: {
      url: mainnetURL,
      chainId: 1,
      accounts,
    },
    bsc: {
      url: bscURL,
      chainId: 56,
      gasPrice: "auto",
      accounts,
    },
    matic: {
      url: maticURL,
      chainId: 137,
      gasPrice: "auto",
      accounts,
    },
    blast: {
      url: blastURL,
      chainId: 81457,
      accounts,
    },
    skale: {
      url: skaleEuropaURL,
      chainId: 2046399126,
      accounts,
    },
    sepolia: {
      url: sepoliaURL,
      chainId: 11155111,
      accounts,
    },
    blast_sepolia: {
      url: blastSepoliaURL,
      chainId: 168587773,
      accounts,

      gasPrice: "auto",
    },
    skale_calypso_testnet: {
      url: skaleCalypsoTestURL,
      chainId: 974399131,
      accounts,
      gasPrice: "auto",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY!,
      blast: process.env.BLASTSCAN_API_KEY!,
      blast_sepolia: process.env.BLASTSCAN_API_KEY!,
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
    path: "./docs/",
    runOnCompile: true,
  }
};

export default config;