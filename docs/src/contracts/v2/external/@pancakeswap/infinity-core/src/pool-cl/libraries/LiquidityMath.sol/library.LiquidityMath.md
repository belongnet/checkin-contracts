# LiquidityMath
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-cl/libraries/LiquidityMath.sol)

**Title:**
Math library for liquidity


## Functions
### addDelta

Add a signed liquidity delta to liquidity and revert if it overflows or underflows


```solidity
function addDelta(uint128 x, int128 y) internal pure returns (uint128 z);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`x`|`uint128`|The liquidity before change|
|`y`|`int128`|The delta by which liquidity should be changed|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`z`|`uint128`|The liquidity delta|


