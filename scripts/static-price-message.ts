import { shortString, TypedData, typedData, Uint256, uint256 } from "starknet";
import { getDomain } from "./snip12";
import { snforge_chainId } from "./helpers/constants";

const contractName = "NFT";

interface StaticPriceHash {
  verifying_contract: string;
  nonce: string;
  deadline: string;
  receiver: string;
  token_id: Uint256;
  whitelisted: boolean;
  token_uri: string;
}

const types = {
  StarknetDomain: [
    { name: "name", type: "shortstring" },
    { name: "version", type: "shortstring" },
    { name: "chainId", type: "shortstring" },
    { name: "revision", type: "shortstring" },
  ],
  StaticPriceHash: [
    { name: "verifying_contract", type: "ContractAddress" },
    { name: "nonce", type: "u128" },
    { name: "deadline", type: "u128" },
    { name: "receiver", type: "ContractAddress" },
    { name: "token_id", type: "u256" },
    { name: "whitelisted", type: "bool" },
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
  staticPriceHashStruct: StaticPriceHash,
  chainId: string
): TypedData {
  return {
    types,
    primaryType: "StaticPriceHash",
    domain: getDomain(contractName, chainId),
    message: {
      verifying_contract: staticPriceHashStruct.verifying_contract,
      nonce: staticPriceHashStruct.nonce,
      deadline: staticPriceHashStruct.deadline,
      receiver: staticPriceHashStruct.receiver,
      token_id: staticPriceHashStruct.token_id,
      whitelisted: staticPriceHashStruct.whitelisted,
      token_uri: staticPriceHashStruct.token_uri,
    },
  };
}

function getTypedDataHash(
  StaticPriceHashStruct: StaticPriceHash,
  chainId: string,
  caller: bigint
): string {
  return typedData.getMessageHash(
    getTypedData(StaticPriceHashStruct, chainId),
    caller
  );
}

const staticPriceHash: StaticPriceHash = {
  verifying_contract: "123",
  nonce: "456",
  deadline: "789",
  receiver: "101112",
  token_id: uint256.bnToUint256(131415),
  whitelisted: true,
  token_uri: "161718",
};

console.log(shortString.encodeShortString("1"));
console.log(
  `Static Price Hash: ${getTypedDataHash(staticPriceHash, snforge_chainId, 1337n)}`
);
