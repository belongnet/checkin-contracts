# IMixedQuoter
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/IMixedQuoter.sol)

**Title:**
MixedQuoter Interface

Supports quoting the calculated amounts for exact input swaps. Is specialized for routes containing a mix of Stable, V2, V3 liquidity, infinity liquidity.

For each pool also tells you the number of initialized ticks crossed and the sqrt price of the pool after the swap.

These functions are not marked view because they rely on calling non-view functions and reverting
to compute the result. They are also not gas efficient and should not be called on-chain.


## Functions
### quoteMixedExactInput

Returns the amount out received for a given exact input swap without executing the swap


```solidity
function quoteMixedExactInput(
    address[] calldata paths,
    bytes calldata actions,
    bytes[] calldata params,
    uint256 amountIn
) external returns (uint256 amountOut, uint256 gasEstimate);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`paths`|`address[]`|The path of the swap, i.e. each token pair in the path|
|`actions`|`bytes`|The actions to take for each pair in the path|
|`params`|`bytes[]`|The params for each action in the path SS_2_EXACT_INPUT_SINGLE params are zero bytes SS_3_EXACT_INPUT_SINGLE params are zero bytes V2_EXACT_INPUT_SINGLE params are zero bytes V3_EXACT_INPUT_SINGLE params are encoded as `uint24 fee` INFI_CL_EXACT_INPUT_SINGLE params are encoded as `QuoteMixedInfiExactInputSingleParams` INFI_EXACT_INPUT_SINGLE params are encoded as `QuoteMixedInfiExactInputSingleParams`|
|`amountIn`|`uint256`|The amount of the first token to swap|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountOut`|`uint256`|The amount of the last token that would be received|
|`gasEstimate`|`uint256`|The estimate of the gas that the swap consumes|


### quoteMixedExactInputSharedContext

Returns the amount out received for a given exact input swap without executing the swap

All swap results will influence the outcome of subsequent swaps within the same pool


```solidity
function quoteMixedExactInputSharedContext(
    address[] calldata paths,
    bytes calldata actions,
    bytes[] calldata params,
    uint256 amountIn
) external returns (uint256 amountOut, uint256 gasEstimate);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`paths`|`address[]`|The path of the swap, i.e. each token pair in the path|
|`actions`|`bytes`|The actions to take for each pair in the path|
|`params`|`bytes[]`|The params for each action in the path SS_2_EXACT_INPUT_SINGLE params are zero bytes SS_3_EXACT_INPUT_SINGLE params are zero bytes V2_EXACT_INPUT_SINGLE params are zero bytes V3_EXACT_INPUT_SINGLE params are encoded as `uint24 fee` INFI_CL_EXACT_INPUT_SINGLE params are encoded as `QuoteMixedInfiExactInputSingleParams` INFI_EXACT_INPUT_SINGLE params are encoded as `QuoteMixedInfiExactInputSingleParams`|
|`amountIn`|`uint256`|The amount of the first token to swap|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountOut`|`uint256`|The amount of the last token that would be received|
|`gasEstimate`|`uint256`|The estimate of the gas that the swap consumes|


### quoteExactInputSingleV3

Returns the amount out received for a given exact input but for a swap of a single pool


```solidity
function quoteExactInputSingleV3(QuoteExactInputSingleV3Params memory params)
    external
    returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`params`|`QuoteExactInputSingleV3Params`|The params for the quote, encoded as `QuoteExactInputSingleParams` tokenIn The token being swapped in tokenOut The token being swapped out fee The fee of the token pool to consider for the pair amountIn The desired input amount sqrtPriceLimitX96 The price limit of the pool that cannot be exceeded by the swap|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountOut`|`uint256`|The amount of `tokenOut` that would be received|
|`sqrtPriceX96After`|`uint160`|The sqrt price of the pool after the swap|
|`initializedTicksCrossed`|`uint32`|The number of initialized ticks that the swap crossed|
|`gasEstimate`|`uint256`|The estimate of the gas that the swap consumes|


### quoteExactInputSingleV2

Returns the amount out received for a given exact input but for a swap of a single V2 pool


```solidity
function quoteExactInputSingleV2(QuoteExactInputSingleV2Params memory params)
    external
    returns (uint256 amountOut, uint256 gasEstimate);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`params`|`QuoteExactInputSingleV2Params`|The params for the quote, encoded as `QuoteExactInputSingleV2Params` tokenIn The token being swapped in tokenOut The token being swapped out amountIn The desired input amount|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountOut`|`uint256`|The amount of `tokenOut` that would be received|
|`gasEstimate`|`uint256`|The estimate of the gas that the swap consumes|


### quoteExactInputSingleStable

Returns the amount out received for a given exact input but for a swap of a single Stable pool


```solidity
function quoteExactInputSingleStable(QuoteExactInputSingleStableParams memory params)
    external
    returns (uint256 amountOut, uint256 gasEstimate);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`params`|`QuoteExactInputSingleStableParams`|The params for the quote, encoded as `QuoteExactInputSingleStableParams` tokenIn The token being swapped in tokenOut The token being swapped out amountIn The desired input amount flag The token amount in a single Stable pool. 2 for 2pool, 3 for 3pool|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountOut`|`uint256`|The amount of `tokenOut` that would be received|
|`gasEstimate`|`uint256`|The estimate of the gas that the swap consumes|


## Errors
### INVALID_ADDRESS

```solidity
error INVALID_ADDRESS();
```

### InputLengthMismatch

```solidity
error InputLengthMismatch();
```

### InvalidPath

```solidity
error InvalidPath();
```

### InvalidPoolKeyCurrency

```solidity
error InvalidPoolKeyCurrency();
```

### NoActions

```solidity
error NoActions();
```

### UnsupportedAction

```solidity
error UnsupportedAction(uint256 action);
```

## Structs
### QuoteMixedInfiExactInputSingleParams

```solidity
struct QuoteMixedInfiExactInputSingleParams {
    PoolKey poolKey;
    bytes hookData;
}
```

### QuoteExactInputSingleV3Params

```solidity
struct QuoteExactInputSingleV3Params {
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint24 fee;
    uint160 sqrtPriceLimitX96;
}
```

### QuoteExactInputSingleV2Params

```solidity
struct QuoteExactInputSingleV2Params {
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
}
```

### QuoteExactInputSingleStableParams

```solidity
struct QuoteExactInputSingleStableParams {
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 flag;
}
```

