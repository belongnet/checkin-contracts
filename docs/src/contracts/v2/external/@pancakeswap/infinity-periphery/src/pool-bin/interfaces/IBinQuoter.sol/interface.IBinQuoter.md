# IBinQuoter
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-bin/interfaces/IBinQuoter.sol)

**Inherits:**
[IQuoter](/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/IQuoter.sol/interface.IQuoter.md)

**Title:**
IBinQuoter Interface

Supports quoting the delta amounts for exact input or exact output swaps.

For each pool also tells you the estimation of gas cost for the swap.

These functions are not marked view because they rely on calling non-view functions and reverting
to compute the result. They are also not gas efficient and should not be called on-chain.


## Functions
### quoteExactInputSingle

Returns the delta amounts for a given exact input swap of a single pool


```solidity
function quoteExactInputSingle(QuoteExactSingleParams memory params)
    external
    returns (uint256 amountOut, uint256 gasEstimate);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`params`|`QuoteExactSingleParams`|The params for the quote, encoded as `QuoteExactSingleParams` poolKey The key for identifying a Bin pool zeroForOne If the swap is from currency0 to currency1 exactAmount The desired input amount hookData arbitrary hookData to pass into the associated hooks|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountOut`|`uint256`|The output quote for the exactIn swap|
|`gasEstimate`|`uint256`|Estimated gas units used for the swap|


### quoteExactInputSingleList

Returns the last swap delta amounts for a given exact input in a list of swap


```solidity
function quoteExactInputSingleList(QuoteExactSingleParams[] memory params)
    external
    returns (uint256 amountOut, uint256 gasEstimate);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`params`|`QuoteExactSingleParams[]`|The params for the quote, encoded as `QuoteExactSingleParams[]` poolKey The key for identifying a Bin pool zeroForOne If the swap is from currency0 to currency1 exactAmount The desired input amount hookData arbitrary hookData to pass into the associated hooks|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountOut`|`uint256`|The last swap output quote for the exactIn swap|
|`gasEstimate`|`uint256`|Estimated gas units used for the swap|


### quoteExactInput

Returns the delta amounts along the swap path for a given exact input swap


```solidity
function quoteExactInput(QuoteExactParams memory params) external returns (uint256 amountOut, uint256 gasEstimate);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`params`|`QuoteExactParams`|the params for the quote, encoded as 'QuoteExactParams' currencyIn The input currency of the swap path The path of the swap encoded as PathKeys that contains currency, fee, and hook info exactAmount The desired input amount|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountOut`|`uint256`|The output quote for the exactIn swap|
|`gasEstimate`|`uint256`|Estimated gas units used for the swap|


### quoteExactOutputSingle

Returns the delta amounts for a given exact output swap of a single pool


```solidity
function quoteExactOutputSingle(QuoteExactSingleParams memory params)
    external
    returns (uint256 amountIn, uint256 gasEstimate);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`params`|`QuoteExactSingleParams`|The params for the quote, encoded as `QuoteExactSingleParams` poolKey The key for identifying a Bin pool zeroForOne If the swap is from currency0 to currency1 exactAmount The desired output amount hookData arbitrary hookData to pass into the associated hooks|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountIn`|`uint256`|The input quote for the exactOut swap|
|`gasEstimate`|`uint256`|Estimated gas units used for the swap|


### quoteExactOutput

Returns the delta amounts along the swap path for a given exact output swap


```solidity
function quoteExactOutput(QuoteExactParams memory params) external returns (uint256 amountIn, uint256 gasEstimate);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`params`|`QuoteExactParams`|the params for the quote, encoded as 'QuoteExactParams' currencyOut The output currency of the swap path The path of the swap encoded as PathKeys that contains currency, fee, and hook info exactAmount The desired output amount|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountIn`|`uint256`|The input quote for the exactOut swap|
|`gasEstimate`|`uint256`|Estimated gas units used for the swap|


