import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import 'solidity-docgen';
import 'hardhat-contract-sizer';
import '@nomicfoundation/hardhat-ledger';
import dotenv from 'dotenv';
import { ChainIds } from './utils/chain-ids';
import { blockscanConfig, createConnect, createLedgerConnect } from './utils/config';

dotenv.config();

let accounts: string[] = [],
  ledgerAccounts: string[] = [];

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
      forking: {
        url: `https://eth.llamarpc.com`,
        blockNumber: 23068383,
      },
      throwOnCallFailures: false,
      accounts: { accountsBalance: '10000000000000000000000000' },
      initialBaseFeePerGas: 0,
      allowUnlimitedContractSize: false,
    },
    // 'ethereum': {
    //   url: 'https://eth.drpc.org',
    // },
    mainnet: createLedgerConnect(ChainIds.mainnet, ledgerAccounts),
    bsc: createLedgerConnect(ChainIds.bsc, ledgerAccounts),
    polygon: createLedgerConnect(ChainIds.polygon, ledgerAccounts),
    blast: createLedgerConnect(ChainIds.blast, ledgerAccounts),
    celo: createLedgerConnect(ChainIds.celo, ledgerAccounts),
    base: createLedgerConnect(ChainIds.base, ledgerAccounts),
    linea: createLedgerConnect(ChainIds.linea, ledgerAccounts),
    astar: createLedgerConnect(ChainIds.astar, ledgerAccounts),
    arbitrum: createLedgerConnect(ChainIds.arbitrum, ledgerAccounts),
    skale_europa: createLedgerConnect(ChainIds.skale_europa, ledgerAccounts),
    skale_nebula: createLedgerConnect(ChainIds.skale_nebula, ledgerAccounts),
    skale_calypso: createLedgerConnect(ChainIds.skale_calypso, ledgerAccounts),
    sepolia: createConnect(ChainIds.sepolia, accounts),
    blast_sepolia: createConnect(ChainIds.blast_sepolia, accounts),
    skale_calypso_testnet: createConnect(ChainIds.skale_calypso_testnet, accounts),
    amoy: createConnect(ChainIds.amoy, accounts),
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY! || '',
      // 'ethereum': 'empty',
      blast: process.env.BLASTSCAN_API_KEY! || '',
      polygon: process.env.POLYSCAN_API_KEY || '',
      celo: process.env.CELOSCAN_API_KEY || '',
      base: process.env.BASESCAN_API_KEY || '',
      linea: process.env.LINEASCAN_API_KEY || '',
      sepolia: process.env.ETHERSCAN_API_KEY! || '',
      amoy: process.env.POLYSCAN_API_KEY || '',
      blast_sepolia: process.env.BLASTSCAN_API_KEY! || '',
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
      blockscanConfig('blast', ChainIds.blast),
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
};

export default config;
