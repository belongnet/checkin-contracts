# ITickLens
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-cl/interfaces/ITickLens.sol)

**Title:**
Tick Lens

Provides functions for fetching chunks of tick data for a pool

This avoids the waterfall of fetching the tick bitmap, parsing the bitmap to know which ticks to fetch, and
then sending additional multicalls to fetch the tick data


## Functions
### getPopulatedTicksInWord

Get all the tick data for the populated ticks from a word of the tick bitmap of a pool


```solidity
function getPopulatedTicksInWord(PoolKey memory key, int16 tickBitmapIndex)
    external
    view
    returns (PopulatedTick[] memory populatedTicks);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`key`|`PoolKey`|The PoolKey of the pool for which to fetch populated tick data|
|`tickBitmapIndex`|`int16`|The index of the word in the tick bitmap for which to parse the bitmap and fetch all the populated ticks|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`populatedTicks`|`PopulatedTick[]`|An array of tick data for the given word in the tick bitmap|


### getPopulatedTicksInWord

Get all the tick data for the populated ticks from a word of the tick bitmap of a pool


```solidity
function getPopulatedTicksInWord(PoolId id, int16 tickBitmapIndex)
    external
    view
    returns (PopulatedTick[] memory populatedTicks);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`PoolId`|The PoolId of the pool for which to fetch populated tick data|
|`tickBitmapIndex`|`int16`|The index of the word in the tick bitmap for which to parse the bitmap and fetch all the populated ticks|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`populatedTicks`|`PopulatedTick[]`|An array of tick data for the given word in the tick bitmap|


## Errors
### PoolNotInitialized

```solidity
error PoolNotInitialized();
```

## Structs
### PopulatedTick

```solidity
struct PopulatedTick {
    int24 tick;
    int128 liquidityNet;
    uint128 liquidityGross;
}
```

