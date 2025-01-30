import { TypedData, typedData, Uint256, uint256 } from "starknet";
import { getDomain } from "./snip12";
import { snforge_chainId } from "../constants";

const contractName = 'NFT';

interface DynamicPriceHash {
	receiver: string,
	token_id: Uint256,
	price: Uint256,
	token_uri: string,
}

const types = {
	StarknetDomain: [
		{ name: "name", type: "shortstring" },
		{ name: "version", type: "shortstring" },
		{ name: "chainId", type: "shortstring" },
		{ name: "revision", type: "shortstring" },
	],
	DynamicPriceHash: [
		{ name: "receiver", type: "ContractAddress" },
		{ name: "token_id", type: "u256" },
		{ name: "price", type: "u256" },
		{ name: "token_uri", type: "felt" },
	],
	u256: [
		{ name: "low", type: "felt" },
		{ name: "high", type: "felt" },
	],
};

// Needed to reproduce the same structure as:
// https://github.com/0xs34n/starknet.js/blob/1a63522ef71eed2ff70f82a886e503adc32d4df9/__mocks__/typedDataStructArrayExample.json
function getTypedData(dynamicPriceHashStruct: DynamicPriceHash, chainId: string): TypedData {
	return {
		types,
		primaryType: "DynamicPriceHash",
		domain: getDomain(contractName, chainId),
		message: {
			"receiver": dynamicPriceHashStruct.receiver,
			"token_id": dynamicPriceHashStruct.token_id,
			"price": dynamicPriceHashStruct.price,
			"token_uri": dynamicPriceHashStruct.token_uri,
		},
	};
}

function getTypedDataHash(dynamicPriceHashStruct: DynamicPriceHash, chainId: string, caller: bigint): string {
	return typedData.getMessageHash(getTypedData(dynamicPriceHashStruct, chainId), caller);
}

const dynamicPriceHash: DynamicPriceHash = {
	receiver: "123",
	token_id: uint256.bnToUint256(456),
	price: uint256.bnToUint256(789),
	token_uri: "101112",
};

console.log(`Dynamic Price Hash: ${getTypedDataHash(dynamicPriceHash, snforge_chainId, 1337n)}`);