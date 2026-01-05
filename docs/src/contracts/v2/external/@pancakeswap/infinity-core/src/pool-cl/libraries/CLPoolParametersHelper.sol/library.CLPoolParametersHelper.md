# CLPoolParametersHelper
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-cl/libraries/CLPoolParametersHelper.sol)

**Title:**
Concentrated Liquidity Pair Parameter Helper Library

This library contains functions to get and set parameters of a pair
The parameters are stored in a single bytes32 variable in the following format:
[0 - 15[: reserve for hooks
[16 - 39[: tickSpacing (24 bits)
[40 - 256[: unused


## State Variables
### OFFSET_TICK_SPACING

```solidity
uint256 internal constant OFFSET_TICK_SPACING = 16
```


### OFFSET_MOST_SIGNIFICANT_UNUSED_BITS

```solidity
uint256 internal constant OFFSET_MOST_SIGNIFICANT_UNUSED_BITS = 40
```


## Functions
### getTickSpacing

Get tickSpacing from the encoded pair parameters


```solidity
function getTickSpacing(bytes32 params) internal pure returns (int24 tickSpacing);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`params`|`bytes32`|The encoded pair parameters, as follows: [0 - 16[: hooks registration bitmaps [16 - 39[: tickSpacing (24 bits) [40 - 256[: unused|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`tickSpacing`|`int24`|The tickSpacing|


### setTickSpacing

Helper method to set tick spacing in the encoded pair parameter


```solidity
function setTickSpacing(bytes32 params, int24 tickSpacing) internal pure returns (bytes32);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes32`|The new encoded pair parameter|


