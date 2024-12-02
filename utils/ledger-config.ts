import { buildUrl, ChainIds } from './chains';

export interface LedgerConfig {
	url: string;
	chainId: ChainIds;
	ledgerAccounts: string[];
}

export function createLedgerConnect(
	chainId: ChainIds,
	ledgerAccounts: string[]
): LedgerConfig {
	if (ledgerAccounts.length === 0) {
		throw new Error('Ledger address not found in environment variables.');
	}

	return { url: buildUrl(chainId), chainId, ledgerAccounts };
}
