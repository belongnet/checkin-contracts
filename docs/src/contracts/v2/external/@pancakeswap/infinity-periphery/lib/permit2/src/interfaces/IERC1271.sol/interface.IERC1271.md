# IERC1271
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/lib/permit2/src/interfaces/IERC1271.sol)


## Functions
### isValidSignature

Should return whether the signature provided is valid for the provided data


```solidity
function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4 magicValue);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`hash`|`bytes32`|     Hash of the data to be signed|
|`signature`|`bytes`|Signature byte array associated with _data|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`magicValue`|`bytes4`|The bytes4 magic value 0x1626ba7e|


