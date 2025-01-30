import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.INFURA_ID_PROJECT;

export enum ChainIds {
	mainnet = 1,
	bsc = 56,
	polygon = 137,
	blast = 81457,
	celo = 42220,
	base = 8453,
	linea = 59144,
	skale_europa = 2046399126,
	skale_nebula = 1482601649,
	skale_calypso = 1564830818,
	sepolia = 11155111,
	blast_sepolia = 168587773,
	skale_calypso_testnet = 974399131,
	amoy = 80002,
}

// Mapping for Infura-supported networks
const infuraNetworks: Partial<Record<ChainIds, string>> = {
	[ChainIds.mainnet]: 'https://mainnet.infura.io/v3/',
	[ChainIds.bsc]: 'https://bsc-mainnet.infura.io/v3/',
	[ChainIds.polygon]: 'https://polygon-mainnet.infura.io/v3/',
	[ChainIds.blast]: 'https://blast-mainnet.infura.io/v3/',
	[ChainIds.celo]: 'https://celo-mainnet.infura.io/v3/',
	[ChainIds.base]: 'https://base-mainnet.infura.io/v3/',
	[ChainIds.linea]: 'https://linea-mainnet.infura.io/v3/',
	[ChainIds.sepolia]: 'https://sepolia.infura.io/v3/',
	[ChainIds.amoy]: 'https://polygon-amoy.infura.io/v3/',
	[ChainIds.blast_sepolia]: 'https://blast-sepolia.infura.io/v3/',
};

// Mapping for Infura-supported networks
const blockscoutNetworks: Partial<Record<ChainIds, string>> = {
	[ChainIds.skale_europa]: 'https://mainnet.skalenodes.com/v1/elated-tan-skat',
	[ChainIds.skale_nebula]: 'https://mainnet.skalenodes.com/v1/green-giddy-denebola',
	[ChainIds.skale_calypso]: 'https://mainnet.skalenodes.com/v1/honorable-steel-rasalhague',
	[ChainIds.skale_calypso_testnet]: 'https://testnet.skalenodes.com/v1/giant-half-dual-testnet',
};

export function buildUrl(
	chainId: ChainIds
): string {
	if (!API_KEY || API_KEY.trim() === '') {
		throw new Error('Provide API key for the network');
	}

	if (infuraNetworks[chainId]) {
		return `${infuraNetworks[chainId]}${API_KEY}`;
	} else if (blockscoutNetworks[chainId]) {
		return blockscoutNetworks[chainId];
	} else {
		throw new Error('No networks provided');
	}
}
