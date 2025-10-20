# Solidity API

## IV3Quoter

Minimal V3-like quoter interface to unify Uniswap V3 / Pancake V3 quoting.

### quoteExactInput

```solidity
function quoteExactInput(bytes path, uint256 amountIn) external returns (uint256 amountOut)
```

Returns a quote for an exact-input swap along the provided path.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| path | bytes | ABI-encoded path of token addresses and fee tiers. |
| amountIn | uint256 | Exact amount of input tokens to quote. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | The quoted amount of output tokens. |

