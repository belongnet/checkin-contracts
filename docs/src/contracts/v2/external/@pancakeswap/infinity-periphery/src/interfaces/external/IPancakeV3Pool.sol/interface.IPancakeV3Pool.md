# IPancakeV3Pool
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/external/IPancakeV3Pool.sol)

**Title:**
IPancakeV3Pool

Interface for the PancakeV3Pool contract


## Functions
### slot0

The 0th storage slot in the pool stores many values, and is exposed as a single method to save gas
when accessed externally.


```solidity
function slot0()
    external
    view
    returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint32 feeProtocol,
        bool unlocked
    );
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`sqrtPriceX96`|`uint160`|The current price of the pool as a sqrt(token1/token0) Q64.96 value tick The current tick of the pool, i.e. according to the last tick transition that was run. This value may not always be equal to SqrtTickMath.getTickAtSqrtRatio(sqrtPriceX96) if the price is on a tick boundary. observationIndex The index of the last oracle observation that was written, observationCardinality The current maximum number of observations stored in the pool, observationCardinalityNext The next maximum number of observations, to be updated when the observation. feeProtocol The protocol fee for both tokens of the pool. Encoded as two 4 bit values, where the protocol fee of token1 is shifted 4 bits and the protocol fee of token0 is the lower 4 bits. Used as the denominator of a fraction of the swap fee, e.g. 4 means 1/4th of the swap fee. unlocked Whether the pool is currently locked to reentrancy|
|`tick`|`int24`||
|`observationIndex`|`uint16`||
|`observationCardinality`|`uint16`||
|`observationCardinalityNext`|`uint16`||
|`feeProtocol`|`uint32`||
|`unlocked`|`bool`||


### tickSpacing

The pool tick spacing

Ticks can only be used at multiples of this value, minimum of 1 and always positive
e.g.: a tickSpacing of 3 means ticks can be initialized every 3rd tick, i.e., ..., -6, -3, 0, 3, 6, ...
This value is an int24 to avoid casting even though it is always positive.


```solidity
function tickSpacing() external view returns (int24);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`int24`|The tick spacing|


### tickBitmap

Returns 256 packed tick initialized boolean values. See TickBitmap for more information


```solidity
function tickBitmap(int16 wordPosition) external view returns (uint256);
```

### swap

Swap token0 for token1, or token1 for token0

The caller of this method receives a callback in the form of IPancakeV3SwapCallback#pancakeV3SwapCallback


```solidity
function swap(
    address recipient,
    bool zeroForOne,
    int256 amountSpecified,
    uint160 sqrtPriceLimitX96,
    bytes calldata data
) external returns (int256 amount0, int256 amount1);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`recipient`|`address`|The address to receive the output of the swap|
|`zeroForOne`|`bool`|The direction of the swap, true for token0 to token1, false for token1 to token0|
|`amountSpecified`|`int256`|The amount of the swap, which implicitly configures the swap as exact input (positive), or exact output (negative)|
|`sqrtPriceLimitX96`|`uint160`|The Q64.96 sqrt price limit. If zero for one, the price cannot be less than this value after the swap. If one for zero, the price cannot be greater than this value after the swap|
|`data`|`bytes`|Any data to be passed through to the callback|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount0`|`int256`|The delta of the balance of token0 of the pool, exact when negative, minimum when positive|
|`amount1`|`int256`|The delta of the balance of token1 of the pool, exact when negative, minimum when positive|


