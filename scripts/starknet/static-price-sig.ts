import { TypedData, typedData, Uint256, uint256 } from 'starknet';

import { snforge_chainId } from '../constants';

import { getDomain } from './snip12';

const contractName = 'NFT';

interface StaticPriceHash {
  receiver: string;
  token_id: Uint256;
  whitelisted: boolean;
  token_uri: string;
}

const types = {
  StarknetDomain: [
    { name: 'name', type: 'shortstring' },
    { name: 'version', type: 'shortstring' },
    { name: 'chainId', type: 'shortstring' },
    { name: 'revision', type: 'shortstring' },
  ],
  StaticPriceHash: [
    { name: 'receiver', type: 'ContractAddress' },
    { name: 'token_id', type: 'u256' },
    { name: 'whitelisted', type: 'bool' },
    { name: 'token_uri', type: 'felt' },
  ],
  u256: [
    { name: 'low', type: 'felt' },
    { name: 'high', type: 'felt' },
  ],
};

// Needed to reproduce the same structure as:
// https://github.com/0xs34n/starknet.js/blob/1a63522ef71eed2ff70f82a886e503adc32d4df9/__mocks__/typedDataStructArrayExample.json
function getTypedData(staticPriceHashStruct: StaticPriceHash, chainId: string): TypedData {
  return {
    types,
    primaryType: 'StaticPriceHash',
    domain: getDomain(contractName, chainId),
    message: {
      receiver: staticPriceHashStruct.receiver,
      token_id: staticPriceHashStruct.token_id,
      whitelisted: staticPriceHashStruct.whitelisted,
      token_uri: staticPriceHashStruct.token_uri,
    },
  };
}

function getTypedDataHash(StaticPriceHashStruct: StaticPriceHash, chainId: string, caller: bigint): string {
  return typedData.getMessageHash(getTypedData(StaticPriceHashStruct, chainId), caller);
}

const staticPriceHash: StaticPriceHash = {
  receiver: '123',
  token_id: uint256.bnToUint256(456),
  whitelisted: true,
  token_uri: '101112',
};

console.log(`Dynamic Price Hash: ${getTypedDataHash(staticPriceHash, snforge_chainId, 1337n)}`);
