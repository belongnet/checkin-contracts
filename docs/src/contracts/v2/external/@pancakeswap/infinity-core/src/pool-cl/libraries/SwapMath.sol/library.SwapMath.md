# SwapMath
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/pool-cl/libraries/SwapMath.sol)

**Title:**
Computes the result of a swap within ticks

Contains methods for computing the result of a swap within a single tick price range, i.e., a single tick.


## State Variables
### MAX_FEE_PIPS

```solidity
uint256 internal constant MAX_FEE_PIPS = LPFeeLibrary.ONE_HUNDRED_PERCENT_FEE
```


## Functions
### getSqrtPriceTarget

Computes the sqrt price target for the next swap step


```solidity
function getSqrtPriceTarget(bool zeroForOne, uint160 sqrtPriceNextX96, uint160 sqrtPriceLimitX96)
    internal
    pure
    returns (uint160 sqrtPriceTargetX96);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`zeroForOne`|`bool`|The direction of the swap, true for currency0 to currency1, false for currency1 to currency0|
|`sqrtPriceNextX96`|`uint160`|The Q64.96 sqrt price for the next initialized tick|
|`sqrtPriceLimitX96`|`uint160`|The Q64.96 sqrt price limit. If zero for one, the price cannot be less than this value after the swap. If one for zero, the price cannot be greater than this value after the swap|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`sqrtPriceTargetX96`|`uint160`|The price target for the next swap step|


### computeSwapStep

Computes the result of swapping some amount in, or amount out, given the parameters of the swap

The fee, plus the amount in, will never exceed the amount remaining if the swap's `amountSpecified` is positive

feePips must be no larger than MAX_FEE_PIPS for this function. We ensure that before setting a fee using LPFeeLibrary.validate.


```solidity
function computeSwapStep(
    uint160 sqrtRatioCurrentX96,
    uint160 sqrtRatioTargetX96,
    uint128 liquidity,
    int256 amountRemaining,
    uint24 feePips
) internal pure returns (uint160 sqrtRatioNextX96, uint256 amountIn, uint256 amountOut, uint256 feeAmount);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sqrtRatioCurrentX96`|`uint160`|The current sqrt price of the pool|
|`sqrtRatioTargetX96`|`uint160`|The price that cannot be exceeded, from which the direction of the swap is inferred|
|`liquidity`|`uint128`|The usable liquidity|
|`amountRemaining`|`int256`|How much input or output amount is remaining to be swapped in/out|
|`feePips`|`uint24`|The fee taken from the input amount, expressed in hundredths of a bip|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`sqrtRatioNextX96`|`uint160`|The price after swapping the amount in/out, not to exceed the price target|
|`amountIn`|`uint256`|The amount to be swapped in, of either token0 or token1, based on the direction of the swap|
|`amountOut`|`uint256`|The amount to be received, of either token0 or token1, based on the direction of the swap|
|`feeAmount`|`uint256`|The amount of input that will be taken as a fee|


