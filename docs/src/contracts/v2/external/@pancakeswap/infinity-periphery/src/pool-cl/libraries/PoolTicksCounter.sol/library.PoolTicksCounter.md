# PoolTicksCounter
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-cl/libraries/PoolTicksCounter.sol)

**Title:**
Pool Ticks Counter

Functions for counting the number of initialized ticks between two ticks


## Functions
### countInitializedTicksLoaded

Count the number of initialized ticks between two ticks

This function counts the number of initialized ticks that would incur a gas cost between tickBefore and tickAfter.
When tickBefore and/or tickAfter themselves are initialized, the logic over whether we should count them depends on the
direction of the swap. If we are swapping upwards (tickAfter > tickBefore) we don't want to count tickBefore but we do
want to count tickAfter. The opposite is true if we are swapping downwards.


```solidity
function countInitializedTicksLoaded(ICLPoolManager self, PoolKey memory key, int24 tickBefore, int24 tickAfter)
    internal
    view
    returns (uint32 initializedTicksLoaded);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`ICLPoolManager`|the IPoolManager|
|`key`|`PoolKey`|the PoolKey of the pool|
|`tickBefore`|`int24`|the tick before the swap|
|`tickAfter`|`int24`|the tick after the swap|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`initializedTicksLoaded`|`uint32`|the number of initialized ticks loaded|


### countOneBits

Count the number of set bits in a uint256


```solidity
function countOneBits(uint256 x) private pure returns (uint16);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`x`|`uint256`|the uint256 to count the bits of|


## Structs
### TickCache

```solidity
struct TickCache {
    int16 wordPosLower;
    int16 wordPosHigher;
    uint8 bitPosLower;
    uint8 bitPosHigher;
    bool tickBeforeInitialized;
    bool tickAfterInitialized;
}
```

