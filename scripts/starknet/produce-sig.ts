import { TypedData, typedData } from "starknet";
import { getDomain } from "./snip12";
import { snforge_chainId } from "../constants";

const contractName = 'NFTFactory';

interface ProduceHash {
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
		{ name: "name_hash", type: "felt" },
		{ name: "symbol_hash", type: "felt" },
		{ name: "contract_uri", type: "felt" },
		{ name: "royalty_fraction", type: "u128" },
	],
};

// Needed to reproduce the same structure as:
// https://github.com/0xs34n/starknet.js/blob/1a63522ef71eed2ff70f82a886e503adc32d4df9/__mocks__/typedDataStructArrayExample.json
function getTypedData(produceHashStruct: ProduceHash, chainId: string): TypedData {
	return {
		types,
		primaryType: "ProduceHash",
		domain: getDomain(contractName, chainId),
		message: {
			"name_hash": produceHashStruct.name_hash,
			"symbol_hash": produceHashStruct.symbol_hash,
			"contract_uri": produceHashStruct.contract_uri,
			"royalty_fraction": produceHashStruct.royalty_fraction,
		},
	};
}

function getTypedDataHash(produceHashStruct: ProduceHash, chainId: string, caller: bigint): string {
	return typedData.getMessageHash(getTypedData(produceHashStruct, chainId), caller);
}

const produceHash: ProduceHash = {
	name_hash: "123",
	symbol_hash: "456",
	contract_uri: "789",
	royalty_fraction: "101112"
};

console.log(`Produce Hash: ${getTypedDataHash(produceHash, snforge_chainId, 1337n)}`);