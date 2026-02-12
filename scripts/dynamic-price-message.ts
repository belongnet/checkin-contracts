import { TypedData, typedData, Uint256, uint256 } from "starknet";
import { getDomain } from "./snip12";
import { snforge_chainId } from "./helpers/constants";
import { verify } from "crypto";

const contractName = "NFT";

export interface DynamicPriceHash {
  verifying_contract: string;
  nonce: string;
  deadline: string;
  receiver: string;
  token_id: Uint256;
  price: Uint256;
  token_uri: string;
}

const types = {
  StarknetDomain: [
    { name: "name", type: "shortstring" },
    { name: "version", type: "shortstring" },
    { name: "chainId", type: "shortstring" },
    { name: "revision", type: "shortstring" },
  ],
  DynamicPriceHash: [
    { name: "verifying_contract", type: "ContractAddress" },
    { name: "nonce", type: "u128" },
    { name: "deadline", type: "u128" },
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
function getTypedData(
  dynamicPriceHashStruct: DynamicPriceHash,
  chainId: string
): TypedData {
  return {
    types,
    primaryType: "DynamicPriceHash",
    domain: getDomain(contractName, chainId),
    message: {
      verifying_contract: dynamicPriceHashStruct.verifying_contract,
      nonce: dynamicPriceHashStruct.nonce,
      deadline: dynamicPriceHashStruct.deadline,
      receiver: dynamicPriceHashStruct.receiver,
      token_id: dynamicPriceHashStruct.token_id,
      price: dynamicPriceHashStruct.price,
      token_uri: dynamicPriceHashStruct.token_uri,
    },
  };
}

function getTypedDataHash(
  dynamicPriceHashStruct: DynamicPriceHash,
  chainId: string,
  caller: bigint
): string {
  return typedData.getMessageHash(
    getTypedData(dynamicPriceHashStruct, chainId),
    caller
  );
}

const dynamicPriceHash: DynamicPriceHash = {
  verifying_contract: "123",
  nonce: "456",
  deadline: "789",
  receiver: "101112",
  token_id: uint256.bnToUint256(141516),
  price: uint256.bnToUint256(171819),
  token_uri: "202122",
};

console.log(
  `Dynamic Price Hash: ${getTypedDataHash(dynamicPriceHash, snforge_chainId, 1337n)}`
);
