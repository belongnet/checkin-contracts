import { shortString, StarknetDomain, TypedDataRevision } from "starknet";

export function getDomain(name: string, chainId: string): StarknetDomain {
	return {
		name: name,
		version: shortString.encodeShortString("1"),
		chainId,
		revision: TypedDataRevision.ACTIVE,
	};
}