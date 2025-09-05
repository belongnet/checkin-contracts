# Solidity API

## IV3Router

Minimal V3-like router interface to unify Uniswap V3 / Pancake V3 exact-input swaps.

### ExactInputParams

Parameters for an exact-input multi-hop swap.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct ExactInputParams {
  bytes path;
  address recipient;
  uint256 deadline;
  uint256 amountIn;
  uint256 amountOutMinimum;
}
```

### exactInput

```solidity
function exactInput(struct IV3Router.ExactInputParams params) external payable returns (uint256 amountOut)
```

Executes an exact-input swap along the provided path.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IV3Router.ExactInputParams | The exact-input swap parameters. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | The amount of output tokens received. |

