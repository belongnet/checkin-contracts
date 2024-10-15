

export enum ChainIds {
	mainnet = 1,
	bsc = 56,
	matic = 137,
	amoy = 80002,
	blast = 81457,
	skale = 2046399126,
	sepolia = 11155111,
	blast_sepolia = 168587773,
	skale_calypso_testnet = 974399131
}

interface NetworkConfig {
	url: string,
	chainId: ChainIds,
	accounts: string[]
}

export function createRPClink(chainid: ChainIds, accounts: string[], apiKey?: string): NetworkConfig {
	if (chainid === ChainIds.mainnet || chainid === ChainIds.matic || chainid == ChainIds.sepolia) {
		if (apiKey == undefined || apiKey == '' || apiKey == null) {
			throw Error('Proive api for the network');
		}
	}

	let url: string;
	switch (chainid) {
		case ChainIds.mainnet:
			url = `https://mainnet.infura.io/v3/${apiKey}`;
			break;
		case ChainIds.bsc:
			url = "https://bsc-dataseed.binance.org";
			break;
		case ChainIds.matic:
			url = `https://polygon-mainnet.infura.io/v3/${apiKey}`;
			break;
		case ChainIds.blast:
			url = `https://rpc.envelop.is/blast`;
			break;
		case ChainIds.skale:
			url = `https://mainnet.skalenodes.com/v1/elated-tan-skat`;
			break;
		case ChainIds.sepolia:
			url = `https://sepolia.infura.io/v3/${apiKey}`;
			break;
		case ChainIds.amoy:
			url = `https://polygon-amoy.drpc.org`;
			break;
		case ChainIds.blast_sepolia:
			url = `https://sepolia.blast.io`;
			break;
		case ChainIds.skale_calypso_testnet:
			url = "https://testnet.skalenodes.com/v1/giant-half-dual-testnet";
			break;
		default:
			throw Error('No networks provided');
	}

	return {
		url,
		chainId: chainid,
		accounts
	} as NetworkConfig
}
