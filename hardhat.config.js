require("dotenv").config();

require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-etherscan");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("@openzeppelin/hardhat-upgrades");

const bscURL = "https://bsc-dataseed.binance.org";
const mainnetURL = `https://mainnet.infura.io/v3/${process.env.INFURA_ID_PROJECT}`;
const maticURL = `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_ID_PROJECT}`;
const sepoliaURL = `https://sepolia.infura.io/v3/${process.env.INFURA_ID_PROJECT}`;

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
    // bsc: {
    //   url: bscURL,
    //   chainId: 56,
    //   gasPrice: "auto",
    //   accounts: { mnemonic: process.env.MNEMONIC },
    //   saveDeployments: true,
    // },
    matic: {
      url: maticURL,
      chainId: 137,
      gasPrice: "auto",
      accounts: [process.env.PK],
      saveDeployments: true,
    },
    mainnet: {
      url: mainnetURL,
      chainId: 1,
      accounts: [process.env.PK],
      saveDeployments: true,
    },
    sepolia: {
      url: sepoliaURL,
      chainId: 11155111,
      accounts: [process.env.PK],
      saveDeployments: true,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
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
