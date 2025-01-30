import { buildUrl, ChainIds } from './chains';
import dotenv from "dotenv";
dotenv.config();

export interface NonLedgerConfig {
	url: string;
	chainId: ChainIds;
	accounts: string[];
}

export function createPrivateKeyConnect(
	chainId: ChainIds,
	accounts: string[]
): NonLedgerConfig {
	if (accounts.length === 0) {
		throw new Error('Account private key is not found in environment variables.');
	}

	return { url: buildUrl(chainId), chainId, accounts };
}
