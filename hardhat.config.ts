import '@nomicfoundation/hardhat-ledger';
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import dotenv from 'dotenv';
import 'hardhat-contract-sizer';
import { HardhatUserConfig } from 'hardhat/config';

import 'solidity-docgen';
import { ChainIds } from './utils/chain-ids';
import { blockscanConfig, createConnect } from './utils/config';

dotenv.config();

let accounts: string[] = [];

if (process.env.PK) {
  accounts = [process.env.PK];
}

const etherscanApiKey = process.env.ETHERSCAN_API_KEY || process.env.BSCSCAN_API_KEY || '';

const defaultHardhatForkBlock = process.env.HARDHAT_MAINNET_FORK_BLOCK
  ? Number(process.env.HARDHAT_MAINNET_FORK_BLOCK)
  : undefined;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.27',
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
      hardfork: process.env.HARDHAT_HARDFORK || 'shanghai',
      forking: {
        url: process.env.INFURA_ID_PROJECT
          ? `https://mainnet.infura.io/v3/${process.env.INFURA_ID_PROJECT}`
          : `https://eth.llamarpc.com`,
        blockNumber: defaultHardhatForkBlock,
        enabled: false,
      },
      // throwOnCallFailures: false,
      accounts: { accountsBalance: '10000000000000000000000000' },
      initialBaseFeePerGas: 0,
      allowUnlimitedContractSize: false,
    },
    // 'ethereum': {
    //   url: 'https://eth.drpc.org',
    // },
    mainnet: createConnect(ChainIds.mainnet, accounts),
    bsc: createConnect(ChainIds.bsc, accounts),
    polygon: createConnect(ChainIds.polygon, accounts),
    blast: createConnect(ChainIds.blast, accounts),
    celo: createConnect(ChainIds.celo, accounts),
    base: createConnect(ChainIds.base, accounts),
    linea: createConnect(ChainIds.linea, accounts),
    astar: createConnect(ChainIds.astar, accounts),
    arbitrum: createConnect(ChainIds.arbitrum, accounts),
    skale_europa: createConnect(ChainIds.skale_europa, accounts),
    skale_nebula: createConnect(ChainIds.skale_nebula, accounts),
    skale_calypso: createConnect(ChainIds.skale_calypso, accounts),
    sepolia: createConnect(ChainIds.sepolia, accounts),
    amoy: createConnect(ChainIds.amoy, accounts),
    bsc_testnet: createConnect(ChainIds.bsc_testnet, accounts),
    blast_sepolia: createConnect(ChainIds.blast_sepolia, accounts),
    skale_calypso_testnet: createConnect(ChainIds.skale_calypso_testnet, accounts),
  },
  etherscan: {
    apiKey: {
      mainnet: etherscanApiKey,
      sepolia: etherscanApiKey,
      polygon: etherscanApiKey,
      amoy: etherscanApiKey,
      blast: etherscanApiKey,
      blast_sepolia: etherscanApiKey,
      bsc: etherscanApiKey,
      bsc_testnet: etherscanApiKey,
      celo: etherscanApiKey,
      base: etherscanApiKey,
      linea: etherscanApiKey,
      arbitrum: etherscanApiKey,
      astar: 'astar', // Is not required by blockscout. Can be any non-empty string
      skale_europa: 'skale_europa', // Is not required by blockscout. Can be any non-empty string
      skale_nebula: 'skale_nebula', // Is not required by blockscout. Can be any non-empty string
      skale_calypso: 'skale_calypso', // Is not required by blockscout. Can be any non-empty string
      skale_calypso_testnet: 'skale_calypso_testnet', // Is not required by blockscout. Can be any non-empty string
    },
    customChains: [
      // {
      //   network: "ethereum",
      //   chainId: 1,
      //   urls: {
      //     apiURL: "https://eth.blockscout.com/api",
      //     browserURL: "https://eth.blockscout.com"
      //   }
      // },
      blockscanConfig('bsc', ChainIds.bsc),
      blockscanConfig('blast', ChainIds.blast),
      blockscanConfig('bsc', ChainIds.bsc),
      blockscanConfig('bsc_testnet', ChainIds.bsc_testnet),
      blockscanConfig('blast_sepolia', ChainIds.blast_sepolia),
      blockscanConfig('celo', ChainIds.celo),
      blockscanConfig('base', ChainIds.base),
      blockscanConfig('linea', ChainIds.linea),
      blockscanConfig('astar', ChainIds.astar),
      blockscanConfig('skale_europa', ChainIds.skale_europa),
      blockscanConfig('skale_nebula', ChainIds.skale_nebula),
      blockscanConfig('skale_calypso', ChainIds.skale_calypso),
      blockscanConfig('blast_sepolia', ChainIds.blast_sepolia),
      blockscanConfig('amoy', ChainIds.amoy),
      blockscanConfig('bsc_testnet', ChainIds.bsc_testnet),
      blockscanConfig('skale_calypso_testnet', ChainIds.skale_calypso_testnet),
    ],
  },
  paths: {
    sources: 'contracts',
  },
  docgen: {
    outputDir: './docs/contracts',
    exclude: ['nft-with-royalties/mocks', 'mocks'],
    pages: 'files',
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  mocha: {
    timeout: 180000, // defense in depth
    parallel: false, // parallel + fork tends to hang
  },
};

export default config;
