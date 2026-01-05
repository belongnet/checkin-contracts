# LiquidityConfigurations
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-bin/libraries/math/LiquidityConfigurations.sol)

This library contains functions to encode and decode the config of a pool and interact with the encoded bytes32.


## State Variables
### OFFSET_ID

```solidity
uint256 private constant OFFSET_ID = 0
```


### OFFSET_DISTRIBUTION_Y

```solidity
uint256 private constant OFFSET_DISTRIBUTION_Y = 24
```


### OFFSET_DISTRIBUTION_X

```solidity
uint256 private constant OFFSET_DISTRIBUTION_X = 88
```


### PRECISION

```solidity
uint256 private constant PRECISION = 1e18
```


## Functions
### encodeParams

Encode the distributionX, distributionY and id into a single bytes32


```solidity
function encodeParams(uint64 distributionX, uint64 distributionY, uint24 id)
    internal
    pure
    returns (bytes32 config);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`distributionX`|`uint64`|The distribution of the first token|
|`distributionY`|`uint64`|The distribution of the second token|
|`id`|`uint24`|The id of the pool|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`config`|`bytes32`|The encoded config as follows: [0 - 24[: id [24 - 88[: distributionY [88 - 152[: distributionX [152 - 256[: empty|


### decodeParams

Decode the distributionX, distributionY and id from a single bytes32


```solidity
function decodeParams(bytes32 config)
    internal
    pure
    returns (uint64 distributionX, uint64 distributionY, uint24 id);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`config`|`bytes32`|The encoded config as follows: [0 - 24[: id [24 - 88[: distributionY [88 - 152[: distributionX [152 - 256[: empty|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`distributionX`|`uint64`|The distribution of the first token|
|`distributionY`|`uint64`|The distribution of the second token|
|`id`|`uint24`|The id of the bin to add the liquidity to|


### getAmountsAndId

Get the amounts and id from a config and amountsIn


```solidity
function getAmountsAndId(bytes32 config, bytes32 amountsIn) internal pure returns (bytes32, uint24);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`config`|`bytes32`|The encoded config as follows: [0 - 24[: id [24 - 88[: distributionY [88 - 152[: distributionX [152 - 256[: empty|
|`amountsIn`|`bytes32`|The amounts to distribute as follows: [0 - 128[: x1 [128 - 256[: x2|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes32`|amounts The distributed amounts as follows: [0 - 128[: x1 [128 - 256[: x2|
|`<none>`|`uint24`|id The id of the bin to add the liquidity to|


## Errors
### LiquidityConfigurations__InvalidConfig

```solidity
error LiquidityConfigurations__InvalidConfig();
```

