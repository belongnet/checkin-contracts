# TickMath
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-cl/libraries/TickMath.sol)

**Title:**
Math library for computing sqrt prices from ticks and vice versa

Computes sqrt price for ticks of size 1.0001, i.e. sqrt(1.0001^tick) as fixed point Q64.96 numbers. Supports
prices between 2**-128 and 2**128


## State Variables
### MIN_TICK
The minimum tick that may be passed to #getSqrtRatioAtTick computed from log base 1.0001 of 2**-128

If ever MIN_TICK and MAX_TICK are not centered around 0, the absTick logic in getSqrtRatioAtTick cannot be used


```solidity
int24 internal constant MIN_TICK = -887272
```


### MAX_TICK
The maximum tick that may be passed to #getSqrtRatioAtTick computed from log base 1.0001 of 2**128

If ever MIN_TICK and MAX_TICK are not centered around 0, the absTick logic in getSqrtRatioAtTick cannot be used


```solidity
int24 internal constant MAX_TICK = 887272
```


### MIN_TICK_SPACING
The minimum tick spacing value drawn from the range of type int16 that is greater than 0, i.e. min from the range [1, 32767]


```solidity
int24 internal constant MIN_TICK_SPACING = 1
```


### MAX_TICK_SPACING
The maximum tick spacing value drawn from the range of type int16, i.e. max from the range [1, 32767]


```solidity
int24 internal constant MAX_TICK_SPACING = type(int16).max
```


### MIN_SQRT_RATIO
The minimum value that can be returned from #getSqrtRatioAtTick. Equivalent to getSqrtRatioAtTick(MIN_TICK)


```solidity
uint160 internal constant MIN_SQRT_RATIO = 4295128739
```


### MAX_SQRT_RATIO
The maximum value that can be returned from #getSqrtRatioAtTick. Equivalent to getSqrtRatioAtTick(MAX_TICK)


```solidity
uint160 internal constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342
```


### MAX_SQRT_RATIO_MINUS_MIN_SQRT_RATIO_MINUS_ONE
A threshold used for optimized bounds check, equals `MAX_SQRT_RATIO - MIN_SQRT_RATIO - 1`


```solidity
uint160 internal constant MAX_SQRT_RATIO_MINUS_MIN_SQRT_RATIO_MINUS_ONE =
    1461446703485210103287273052203988822378723970342 - 4295128739 - 1
```


## Functions
### maxUsableTick

Given a tickSpacing, compute the maximum usable tick


```solidity
function maxUsableTick(int24 tickSpacing) internal pure returns (int24);
```

### minUsableTick

Given a tickSpacing, compute the minimum usable tick


```solidity
function minUsableTick(int24 tickSpacing) internal pure returns (int24);
```

### getSqrtRatioAtTick

Calculates sqrt(1.0001^tick) * 2^96

Throws if |tick| > max tick


```solidity
function getSqrtRatioAtTick(int24 tick) internal pure returns (uint160 sqrtPriceX96);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tick`|`int24`|The input tick for the above formula|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`sqrtPriceX96`|`uint160`|A Fixed point Q64.96 number representing the sqrt of the ratio of the two assets (currency1/currency0) at the given tick|


### getTickAtSqrtRatio

Calculates the greatest tick value such that getRatioAtTick(tick) <= ratio

Throws in case sqrtPriceX96 < MIN_SQRT_RATIO, as MIN_SQRT_RATIO is the lowest value getRatioAtTick may
ever return.


```solidity
function getTickAtSqrtRatio(uint160 sqrtPriceX96) internal pure returns (int24 tick);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sqrtPriceX96`|`uint160`|The sqrt ratio for which to compute the tick as a Q64.96|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`tick`|`int24`|The greatest tick for which the ratio is less than or equal to the input ratio|


## Errors
### InvalidTick
Thrown when the tick passed to #getSqrtRatioAtTick is not between MIN_TICK and MAX_TICK


```solidity
error InvalidTick(int24 tick);
```

### InvalidSqrtRatio
Thrown when the ratio passed to #getTickAtSqrtRatio does not correspond to a price between MIN_TICK and MAX_TICK


```solidity
error InvalidSqrtRatio(uint160 sqrtPriceX96);
```

