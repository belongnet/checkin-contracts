# Solidity API

## IV3RouterLike

Minimal interface shared by Uniswap v3-style and PancakeSwap v3-style exact-input routers.

### ExactInputSingleParams

Parameters for a single-hop exact-input swap.

```solidity
struct ExactInputSingleParams {
  address tokenIn;
  address tokenOut;
  uint24 fee;
  address recipient;
  uint256 deadline;
  uint256 amountIn;
  uint256 amountOutMinimum;
  uint160 sqrtPriceLimitX96;
}
```

### ExactInputParams

Parameters for a multi-hop exact-input swap.

```solidity
struct ExactInputParams {
  bytes path;
  address recipient;
  uint256 deadline;
  uint256 amountIn;
  uint256 amountOutMinimum;
}
```

### exactInputSingle

```solidity
function exactInputSingle(struct IV3RouterLike.ExactInputSingleParams params) external payable returns (uint256 amountOut)
```

Executes a single-hop exact-input swap.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IV3RouterLike.ExactInputSingleParams | Swap parameters accepted by the v3-style router. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | Amount returned by the router. |

### exactInput

```solidity
function exactInput(struct IV3RouterLike.ExactInputParams params) external payable returns (uint256 amountOut)
```

Executes a multi-hop exact-input swap.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IV3RouterLike.ExactInputParams | Packed-path swap parameters accepted by the v3-style router. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | Amount returned by the router. |

## IUniversalRouterLike

Minimal Universal Router interface used for v4 swap commands.

### execute

```solidity
function execute(bytes commands, bytes[] inputs) external payable
```

Executes commands without an explicit deadline.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| commands | bytes | Encoded command bytes. |
| inputs | bytes[] | Command-specific payloads. |

### execute

```solidity
function execute(bytes commands, bytes[] inputs, uint256 deadline) external payable
```

Executes commands with an explicit deadline.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| commands | bytes | Encoded command bytes. |
| inputs | bytes[] | Command-specific payloads. |
| deadline | uint256 | Timestamp after which the router should revert. |

## IAllowanceTransferLike

Minimal Permit2 allowance interface used by v4 Universal Router integrations.

### approve

```solidity
function approve(address token, address spender, uint160 amount, uint48 expiration) external
```

Approves `spender` to spend `token` through Permit2.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | ERC-20 token being approved. |
| spender | address | Address receiving the Permit2 allowance. |
| amount | uint160 | Allowance amount, stored as uint160 by Permit2. |
| expiration | uint48 | Permit2 allowance expiration timestamp. |

## DualDexSwapV4Lib

Stateless exact-input swap helper for Uniswap v4, PancakeSwap Infinity CL, and v3-style routers.
@dev
- The caller must hold the input ERC-20 tokens before calling a swap function.
- The library approves the configured router for the exact input amount, executes the swap, then clears approvals.
- For UniV4 and PcsV4, the library also approves the chain-specific Permit2 contract when code exists there.
- Native currency input is not supported; wrap native assets before routing through this library.
- Output amounts are measured as the recipient's ERC-20 balance delta, then checked against `amountOutMinimum`.

### PoolTokenMismatch

```solidity
error PoolTokenMismatch(address tokenIn, address tokenOut)
```

Reverts when a provided pool key does not contain the requested token pair.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | Requested input token. |
| tokenOut | address | Requested output token. |

### RouterNotConfigured

```solidity
error RouterNotConfigured(enum DualDexSwapV4Lib.DexType dexType)
```

Reverts when no router is configured for the selected DEX type.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dexType | enum DualDexSwapV4Lib.DexType | DEX type being routed. |

### PoolKeyMissing

```solidity
error PoolKeyMissing()
```

Reverts when a required pool key, fee tier, or path element is missing or malformed.

### AmountTooLarge

```solidity
error AmountTooLarge(uint256 amount)
```

Reserved for amount values that cannot fit downstream router or Permit2 integer widths.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Amount that is too large. |

### InvalidRecipient

```solidity
error InvalidRecipient()
```

Reverts when a swap recipient is the zero address.

### QuoteFailed

```solidity
error QuoteFailed()
```

Reverts when the recipient balance delta is lower than the requested minimum output.

### ZeroAmountIn

```solidity
error ZeroAmountIn()
```

Reverts when an exact-input swap is called with a zero input amount.

### NativeInputUnsupported

```solidity
error NativeInputUnsupported()
```

Reverts when native currency is supplied as the input token.

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

### ExactInputSingleParams

Common swap executor parameters for a single-hop pair.

```solidity
struct ExactInputSingleParams {
  address tokenIn;
  address tokenOut;
  uint256 amountIn;
  uint256 amountOutMinimum;
  uint256 deadline;
  bytes poolKey;
  bytes hookData;
  address recipient;
}
```

### ExactInputMultiParams

Multi-hop swap parameters across a path of pools.

```solidity
struct ExactInputMultiParams {
  address[] tokens;
  bytes[] poolKeys;
  uint256 amountIn;
  uint256 amountOutMinimum;
  uint256 deadline;
  bytes hookData;
  address recipient;
}
```

### PaymentsInfo

DEX routing, token, and quote configuration used by the swap helpers.

_`slippageBps` is named for legacy compatibility but uses Helper's 27-decimal scale._

```solidity
struct PaymentsInfo {
  enum DualDexSwapV4Lib.DexType dexType;
  uint96 slippageBps;
  address router;
  address usdToken;
  address long;
  uint256 maxPriceFeedDelay;
  bytes poolKey;
  bytes hookData;
}
```

### swapExact

```solidity
function swapExact(struct DualDexSwapV4Lib.PaymentsInfo info, struct DualDexSwapV4Lib.ExactInputSingleParams params) external returns (uint256 received)
```

Executes an exact-input single-hop swap on the configured DEX.
@dev
Reverts unless `params.amountIn` is positive, `params.recipient` is nonzero, `info.router` is configured,
and `params.poolKey` matches the selected route type. The caller must already hold `params.amountIn`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| info | struct DualDexSwapV4Lib.PaymentsInfo | DEX routing configuration. |
| params | struct DualDexSwapV4Lib.ExactInputSingleParams | Single-hop swap parameters. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| received | uint256 | The amount of `tokenOut` delivered to `params.recipient`. |

### swapExactPath

```solidity
function swapExactPath(struct DualDexSwapV4Lib.PaymentsInfo info, struct DualDexSwapV4Lib.ExactInputMultiParams params) external returns (uint256 received)
```

Executes an exact-input multi-hop swap (path) on the configured dex.
@dev
`params.tokens` must contain at least two addresses and `params.poolKeys.length` must equal
`params.tokens.length - 1`. For v4 routes, each pool key is decoded and validated against its hop tokens.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| info | struct DualDexSwapV4Lib.PaymentsInfo | DEX routing configuration. |
| params | struct DualDexSwapV4Lib.ExactInputMultiParams | Multi-hop swap path and execution parameters. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| received | uint256 | The amount of the final path token delivered to `params.recipient`. |

### swapUSDtokenToLONG

```solidity
function swapUSDtokenToLONG(struct DualDexSwapV4Lib.PaymentsInfo info, address recipient, uint256 amount, uint256 amountOutMinimum, uint256 deadline) external returns (uint256 swapped)
```

Swaps the configured USDtoken to LONG for a recipient.

_Returns zero without side effects when `recipient` is zero or `amount` is zero._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| info | struct DualDexSwapV4Lib.PaymentsInfo | DEX routing configuration containing `usdToken`, `long`, `poolKey`, and `hookData`. |
| recipient | address | Address receiving the LONG output. |
| amount | uint256 | Exact USDtoken amount to swap, in USDtoken-native decimals. |
| amountOutMinimum | uint256 | Minimum acceptable LONG output. |
| deadline | uint256 | Router deadline timestamp; zero uses the selected router path's default behavior. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| swapped | uint256 | The amount of LONG delivered to `recipient`. |

### swapLONGtoUSDtoken

```solidity
function swapLONGtoUSDtoken(struct DualDexSwapV4Lib.PaymentsInfo info, address recipient, uint256 amount, uint256 amountOutMinimum, uint256 deadline) external returns (uint256 swapped)
```

Swaps LONG to the configured USDtoken for a recipient.

_Returns zero without side effects when `recipient` is zero or `amount` is zero._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| info | struct DualDexSwapV4Lib.PaymentsInfo | DEX routing configuration containing `long`, `usdToken`, `poolKey`, and `hookData`. |
| recipient | address | Address receiving the USDtoken output. |
| amount | uint256 | Exact LONG amount to swap, in LONG-native decimals. |
| amountOutMinimum | uint256 | Minimum acceptable USDtoken output. |
| deadline | uint256 | Router deadline timestamp; zero uses the selected router path's default behavior. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| swapped | uint256 | The amount of USDtoken delivered to `recipient`. |

### _swapExact

```solidity
function _swapExact(struct DualDexSwapV4Lib.PaymentsInfo info, struct DualDexSwapV4Lib.ExactInputSingleParams params) internal returns (uint256 received)
```

Internal implementation shared by the single-hop external entrypoints.

_Measures actual output using `params.tokenOut.balanceOf(params.recipient)` before and after the swap._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| info | struct DualDexSwapV4Lib.PaymentsInfo | DEX routing configuration. |
| params | struct DualDexSwapV4Lib.ExactInputSingleParams | Single-hop swap parameters. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| received | uint256 | Recipient balance delta for `params.tokenOut`. |

