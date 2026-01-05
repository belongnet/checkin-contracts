# DualDexSwapV4Lib
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/platform/extensions/DualDexSwapV4Lib.sol)

Stateless helper for routing swaps across Uniswap v4 and Pancake Infinity.


## Functions
### swapExact

Executes an exact-input single-hop swap on the configured dex.


```solidity
function swapExact(PaymentsInfo memory info, ExactInputSingleParams memory params)
    external
    returns (uint256 received);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`info`|`PaymentsInfo`|Cached payments configuration for the selected dex.|
|`params`|`ExactInputSingleParams`|Swap parameters shared between Uniswap v4 and Pancake Infinity.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`received`|`uint256`|The amount of `tokenOut` delivered to `params.recipient`.|


### swapExactPath

Executes an exact-input multi-hop swap (path) on the configured dex.


```solidity
function swapExactPath(PaymentsInfo memory info, ExactInputMultiParams memory params)
    external
    returns (uint256 received);
```

### swapUSDtokenToLONG

Swaps USDtoken to LONG for a recipient using the configured v4 router.


```solidity
function swapUSDtokenToLONG(
    PaymentsInfo memory info,
    address recipient,
    uint256 amount,
    uint256 amountOutMinimum,
    uint256 deadline
) external returns (uint256 swapped);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`info`|`PaymentsInfo`|Cached payments configuration for the selected dex.|
|`recipient`|`address`|Address receiving the LONG output.|
|`amount`|`uint256`|Exact USDtoken amount to swap.|
|`amountOutMinimum`|`uint256`||
|`deadline`|`uint256`||

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`swapped`|`uint256`|The amount of LONG delivered to `recipient`.|


### swapLONGtoUSDtoken

Swaps LONG to USDtoken for a recipient using the configured v4 router.


```solidity
function swapLONGtoUSDtoken(
    PaymentsInfo memory info,
    address recipient,
    uint256 amount,
    uint256 amountOutMinimum,
    uint256 deadline
) external returns (uint256 swapped);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`info`|`PaymentsInfo`|Cached payments configuration for the selected dex.|
|`recipient`|`address`|Address receiving the USDtoken output.|
|`amount`|`uint256`|Exact LONG amount to swap.|
|`amountOutMinimum`|`uint256`||
|`deadline`|`uint256`||

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`swapped`|`uint256`|The amount of USDtoken delivered to `recipient`.|


### _swapExact


```solidity
function _swapExact(PaymentsInfo memory info, ExactInputSingleParams memory params)
    internal
    returns (uint256 received);
```

### _executeOnUniswapV4


```solidity
function _executeOnUniswapV4(PaymentsInfo memory info, ExactInputSingleParams memory params) private;
```

### _executeOnPancakeV4


```solidity
function _executeOnPancakeV4(PaymentsInfo memory info, ExactInputSingleParams memory params) private;
```

### _executeOnV3


```solidity
function _executeOnV3(PaymentsInfo memory info, ExactInputSingleParams memory params) private;
```

### _executeUniV4Path


```solidity
function _executeUniV4Path(PaymentsInfo memory info, ExactInputMultiParams memory params) private;
```

### _executePcsV4Path


```solidity
function _executePcsV4Path(PaymentsInfo memory info, ExactInputMultiParams memory params) private;
```

### _executeV3Path


```solidity
function _executeV3Path(PaymentsInfo memory info, ExactInputMultiParams memory params) private;
```

### _toUint128


```solidity
function _toUint128(uint256 amount) private pure returns (uint128 casted);
```

### _validateUniPoolKey


```solidity
function _validateUniPoolKey(UniPoolKey memory poolKey, address tokenIn, address tokenOut)
    private
    pure
    returns (bool zeroForOne, UniCurrency outputCurrency);
```

### _validatePcsPoolKey


```solidity
function _validatePcsPoolKey(PcsPoolKey memory poolKey, address tokenIn, address tokenOut)
    private
    pure
    returns (bool zeroForOne, PcsCurrency outputCurrency);
```

### _decodeV3Fee


```solidity
function _decodeV3Fee(bytes memory data) private pure returns (uint24 fee);
```

### _buildV3Path


```solidity
function _buildV3Path(address[] memory tokens, bytes[] memory feeData) private pure returns (bytes memory path);
```

### _balanceOf


```solidity
function _balanceOf(address token, address owner) private view returns (uint256);
```

## Errors
### PoolTokenMismatch

```solidity
error PoolTokenMismatch(address tokenIn, address tokenOut);
```

### RouterNotConfigured

```solidity
error RouterNotConfigured(DexType dexType);
```

### PoolKeyMissing

```solidity
error PoolKeyMissing();
```

### AmountTooLarge

```solidity
error AmountTooLarge(uint256 amount);
```

### InvalidRecipient

```solidity
error InvalidRecipient();
```

### QuoteFailed

```solidity
error QuoteFailed();
```

### ZeroAmountIn

```solidity
error ZeroAmountIn();
```

### NativeInputUnsupported

```solidity
error NativeInputUnsupported();
```

## Structs
### ExactInputSingleParams
Common swap executor parameters for a single-hop pair.


```solidity
struct ExactInputSingleParams {
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint256 deadline;
    bytes poolKey; // ABI-encoded PoolKey (v4) or fee tier (v3)
    bytes hookData;
    address recipient;
}
```

### ExactInputMultiParams
Multi-hop swap parameters across a path of pools.


```solidity
struct ExactInputMultiParams {
    address[] tokens; // [tokenIn, ..., tokenOut]
    bytes[] poolKeys; // ABI-encoded PoolKey (v4) or fee tier (v3) per hop (length = tokens.length - 1)
    uint256 amountIn;
    uint256 amountOutMinimum; // final hop min out
    uint256 deadline;
    bytes hookData;
    address recipient;
}
```

### PaymentsInfo
DEX routing and token addresses.

Slippage tolerance scaled to 27 decimals where 1e27 == 100%.

Used by `Helper.amountOutMin`; valid range [0, 1e27].


```solidity
struct PaymentsInfo {
    DexType dexType;
    uint96 slippageBps;
    address router;
    address usdToken;
    address long;
    uint256 maxPriceFeedDelay;
    /// @dev Encoded PoolKey (v4) or abi-encoded fee tier (v3) for single-hop swaps.
    bytes poolKey;
    bytes hookData;
}
```

## Enums
### DexType
Supported DEX integrations for the dual swap helper.


```solidity
enum DexType {
    UniV4,
    PcsV4,
    PcsV3,
    UniV3
}
```

