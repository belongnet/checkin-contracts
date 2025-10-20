import { TypedData, typedData } from "starknet";
import { getDomain } from "./snip12";
import { snforge_chainId } from "./helpers/constants";

const contractName = 'NFTFactory';

export interface ProduceHash {
	creator_address: string,
	name_hash: string,
	symbol_hash: string,
	contract_uri: string,
	royalty_fraction: string,
}

const types = {
	StarknetDomain: [
		{ name: "name", type: "shortstring" },
		{ name: "version", type: "shortstring" },
		{ name: "chainId", type: "shortstring" },
		{ name: "revision", type: "shortstring" },
	],
	ProduceHash: [
		{ name: "creator_address", type: "ContractAddress" },
		{ name: "name_hash", type: "felt" },
		{ name: "symbol_hash", type: "felt" },
		{ name: "contract_uri", type: "felt" },
		{ name: "royalty_fraction", type: "u128" },
	],
};

// Needed to reproduce the same structure as:
// https://github.com/0xs34n/starknet.js/blob/1a63522ef71eed2ff70f82a886e503adc32d4df9/__mocks__/typedDataStructArrayExample.json
export function getTypedData(produceHashStruct: ProduceHash, chainId: string): TypedData {
	return {
		types,
		primaryType: "ProduceHash",
		domain: getDomain(contractName, chainId),
		message: {
			"creator_address": produceHashStruct.creator_address,
			"name_hash": produceHashStruct.name_hash,
			"symbol_hash": produceHashStruct.symbol_hash,
			"contract_uri": produceHashStruct.contract_uri,
			"royalty_fraction": produceHashStruct.royalty_fraction,
		},
	};
}

export function getTypedDataHash(produceHashStruct: ProduceHash, chainId: string, caller: bigint | string): string {
	return typedData.getMessageHash(getTypedData(produceHashStruct, chainId), caller);
}

const produceHash: ProduceHash = {
	creator_address: "123",
	name_hash: "456",
	symbol_hash: "789",
	contract_uri: "101112",
	royalty_fraction: "131415"
};

console.log(`Produce Hash: ${getTypedDataHash(produceHash, snforge_chainId, 1337n)}`);