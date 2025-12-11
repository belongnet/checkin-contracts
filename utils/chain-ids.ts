import dotenv from 'dotenv';
dotenv.config();

export enum ChainIds {
  mainnet = 1,
  sepolia = 11155111,
  bsc = 56,
  polygon = 137,
  blast = 81457,
  celo = 42220,
  base = 8453,
  linea = 59144,
  astar = 592,
  arbitrum = 42161,
  skale_europa = 2046399126,
  skale_nebula = 1482601649,
  skale_calypso = 1564830818,
  blast_sepolia = 168587773,
  bsc_testnet = 97,
  skale_calypso_testnet = 974399131,
  amoy = 80002,
}

export const chainRPCs = (chainid: ChainIds, _apiKey?: string): string => {
  switch (chainid) {
    case ChainIds.mainnet:
      return process.env.INFURA_ID_PROJECT
        ? `https://mainnet.infura.io/v3/${process.env.INFURA_ID_PROJECT}`
        : `https://eth.llamarpc.com`;
    case ChainIds.bsc:
      if (process.env.BSC_RPC_URL && process.env.BSC_RPC_URL.trim().length > 0) {
        return process.env.BSC_RPC_URL;
      }
      if (process.env.INFURA_ID_PROJECT) {
        return `https://bsc-mainnet.infura.io/v3/${process.env.INFURA_ID_PROJECT}`;
      }
      return 'https://bsc-dataseed.binance.org';
    case ChainIds.polygon:
      return `https://polygon.llamarpc.com`;
    case ChainIds.blast:
      return `https://rpc.envelop.is/blast`;
    case ChainIds.celo:
      return `https://rpc.ankr.com/celo`;
    case ChainIds.base:
      return `https://base.llamarpc.com`;
    case ChainIds.linea:
      return `https://linea-rpc.publicnode.com`;
    case ChainIds.astar:
      return `https://1rpc.io/astr`;
    case ChainIds.arbitrum:
      return `https://arbitrum.llamarpc.com`;
    case ChainIds.skale_europa:
      return `https://mainnet.skalenodes.com/v1/elated-tan-skat`;
    case ChainIds.skale_nebula:
      return `https://mainnet.skalenodes.com/v1/green-giddy-denebola`;
    case ChainIds.skale_calypso:
      return `https://mainnet.skalenodes.com/v1/honorable-steel-rasalhague`;
    case ChainIds.sepolia:
      return `https://ethereum-sepolia-rpc.publicnode.com`;
    case ChainIds.amoy:
      return `https://rpc-amoy.polygon.technology`;
    case ChainIds.bsc_testnet:
      return `https://api.zan.top/bsc-testnet`;
    case ChainIds.blast_sepolia:
      return `https://sepolia.blast.io`;
    case ChainIds.skale_calypso_testnet:
      return 'https://testnet.skalenodes.com/v1/giant-half-dual-testnet';
    default:
      throw Error('No networks provided');
  }
};
