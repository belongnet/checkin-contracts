# BitMath
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-cl/libraries/BitMath.sol)

**Title:**
BitMath

**Author:**
Solady (https://github.com/Vectorized/solady/blob/8200a70e8dc2a77ecb074fc2e99a2a0d36547522/src/utils/LibBit.sol)

This library provides functionality for computing bit properties of an unsigned integer


## Functions
### mostSignificantBit

Returns the index of the most significant bit of the number,
where the least significant bit is at index 0 and the most significant bit is at index 255


```solidity
function mostSignificantBit(uint256 x) internal pure returns (uint8 r);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`x`|`uint256`|the value for which to compute the most significant bit, must be greater than 0|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`r`|`uint8`|the index of the most significant bit|


### leastSignificantBit

Returns the index of the least significant bit of the number,
where the least significant bit is at index 0 and the most significant bit is at index 255


```solidity
function leastSignificantBit(uint256 x) internal pure returns (uint8 r);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`x`|`uint256`|the value for which to compute the least significant bit, must be greater than 0|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`r`|`uint8`|the index of the least significant bit|


