# BinPoolParametersHelper
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/pool-bin/libraries/BinPoolParametersHelper.sol)

**Title:**
Bin Pool Pair Parameter Helper Library

This library contains functions to get and set parameters of a pair
The parameters are stored in a single bytes32 variable in the following format:
[0 - 16[: reserve for hooks
[16 - 31[: binStep (16 bits)
[32 - 256[: unused


## State Variables
### OFFSET_BIN_STEP

```solidity
uint256 internal constant OFFSET_BIN_STEP = 16
```


### OFFSET_MOST_SIGNIFICANT_UNUSED_BITS

```solidity
uint256 internal constant OFFSET_MOST_SIGNIFICANT_UNUSED_BITS = 32
```


## Functions
### getBinStep

Get binstep from the encoded pair parameters


```solidity
function getBinStep(bytes32 params) internal pure returns (uint16 binStep);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`params`|`bytes32`|The encoded pair parameters, as follows: [0 - 15[: bitmap for hooks registration [16 - 31[: binSteps (16 bits) [32 - 256[: unused|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`binStep`|`uint16`|The binStep|


### setBinStep

Helper method to set bin step in the encoded pair parameter


```solidity
function setBinStep(bytes32 params, uint16 binStep) internal pure returns (bytes32);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes32`|The new encoded pair parameter|


