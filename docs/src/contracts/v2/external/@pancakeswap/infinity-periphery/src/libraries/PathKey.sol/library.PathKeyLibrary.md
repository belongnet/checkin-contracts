# PathKeyLibrary
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/libraries/PathKey.sol)


## Functions
### getPoolAndSwapDirection

Get the pool and swap direction for a given PathKey


```solidity
function getPoolAndSwapDirection(PathKey memory params, Currency currencyIn)
    internal
    pure
    returns (PoolKey memory poolKey, bool zeroForOne);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`params`|`PathKey`|the given PathKey|
|`currencyIn`|`Currency`|the input currency|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`poolKey`|`PoolKey`|the pool key of the swap|
|`zeroForOne`|`bool`|the direction of the swap, true if currency0 is being swapped for currency1|


