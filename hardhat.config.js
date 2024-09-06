require("dotenv").config();

require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-etherscan");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("@openzeppelin/hardhat-upgrades");
require("@shardlabs/starknet-hardhat-plugin");

const mainnetURL = `https://mainnet.infura.io/v3/${process.env.INFURA_ID_PROJECT}`;
const bscURL = "https://bsc-dataseed.binance.org";
const maticURL = `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_ID_PROJECT}`;
const sepoliaURL = `https://sepolia.infura.io/v3/${process.env.INFURA_ID_PROJECT}`;
const blastURL = `https://rpc.envelop.is/blast`;
const blastSepoliaURL = `https://sepolia.blast.io`;
const skaleEuropaURL = `https://mainnet.skalenodes.com/v1/elated-tan-skat`;

module.exports = {
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
      accounts: [process.env.PK],
      saveDeployments: true,
    },
    bsc: {
      url: bscURL,
      chainId: 56,
      gasPrice: "auto",
      accounts: [process.env.PK],
      saveDeployments: true,
    },
    matic: {
      url: maticURL,
      chainId: 137,
      gasPrice: "auto",
      accounts: [process.env.PK],
      saveDeployments: true,
    },
    blast: {
      url: blastURL,
      chainId: 81457,
      accounts: [process.env.PK],
      saveDeployments: true,
    },
    skale: {
      url: skaleEuropaURL,
      chainId: 2046399126,
      accounts: [process.env.PK],
      saveDeployments: true,
    },
    sepolia: {
      url: sepoliaURL,
      chainId: 11155111,
      accounts: [process.env.PK],
      saveDeployments: true,
    },
    blast_sepolia: {
      url: blastSepoliaURL,
      chainId: 168587773,
      accounts: [process.env.PK],
      saveDeployments: true,
      gasPrice: "auto",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      blast: process.env.BLASTSCAN_API_KEY,
      blast_sepolia: process.env.BLASTSCAN_API_KEY,
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
    ],
  },
  namedAccounts: {
    deployer: 0,
  },
  paths: {
    sources: "contracts",
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS === "true" ? true : false,
  },
  mocha: {
    timeout: 20000000,
  },
};
