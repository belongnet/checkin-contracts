# ParametersHelper
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/libraries/math/ParametersHelper.sol)


## State Variables
### OFFSET_HOOK

```solidity
uint256 internal constant OFFSET_HOOK = 0
```


## Functions
### getHooksRegistrationBitmap

Get the hooks registration bitmap from the encoded parameters


```solidity
function getHooksRegistrationBitmap(bytes32 params) internal pure returns (uint16 bitmap);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`params`|`bytes32`|The encoded parameters, as follows: [0 - 16[: bitmap for hooks registration (16 bits) [16 - 256[: other parameters|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`bitmap`|`uint16`|The bitmap|


### checkUnusedBitsAllZero


```solidity
function checkUnusedBitsAllZero(bytes32 params, uint256 mostSignificantUnUsedBitOffset) internal pure;
```

## Errors
### UnusedBitsNonZero

```solidity
error UnusedBitsNonZero();
```

