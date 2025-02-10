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
  skale_calypso_testnet = 974399131,
  amoy = 80002,
}

export const chainRPCs = (chainid: ChainIds, apiKey?: string): string => {
  switch (chainid) {
    case ChainIds.mainnet:
      return `https://eth.llamarpc.com`;
    case ChainIds.bsc:
      return "https://bsc-dataseed.binance.org";
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
    case ChainIds.blast_sepolia:
      return `https://sepolia.blast.io`;
    case ChainIds.skale_calypso_testnet:
      return "https://testnet.skalenodes.com/v1/giant-half-dual-testnet";
    default:
      throw Error("No networks provided");
  }
};

export const blockscanUrls = (chainid: ChainIds, apiKey?: string): string => {
  if (
    chainid === ChainIds.mainnet ||
    chainid === ChainIds.polygon ||
    chainid == ChainIds.sepolia
  ) {
    if (apiKey == undefined || apiKey == "" || apiKey == null) {
      throw Error("Provide api for the network.");
    }
  }

  switch (chainid) {
    case ChainIds.blast:
      return `https://blastscan.io/`;
    case ChainIds.celo:
      return `https://celoscan.io/`;
    case ChainIds.base:
      return `https://basescan.org/`;
    case ChainIds.linea:
      return `https://lineascan.build/`;
    case ChainIds.astar:
      return `https://astar.blockscout.com/`;
    case ChainIds.blast_sepolia:
      return `https://sepolia.blastscan.io/`;
    case ChainIds.amoy:
      return `https://amoy.polygonscan.com`;
    case ChainIds.arbitrum:
      return `https://arbiscan.io/`;
    case ChainIds.skale_europa:
      return `https://elated-tan-skat.explorer.mainnet.skalenodes.com/`;
    case ChainIds.skale_nebula:
      return `https://green-giddy-denebola.explorer.mainnet.skalenodes.com/`;
    case ChainIds.skale_calypso:
      return `https://honorable-steel-rasalhague.explorer.mainnet.skalenodes.com/`;
    case ChainIds.skale_calypso_testnet:
      return `https://giant-half-dual-testnet.explorer.testnet.skalenodes.com/`;
    default:
      throw Error("No networks provided");
  }
};
