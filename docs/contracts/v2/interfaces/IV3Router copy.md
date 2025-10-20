# Solidity API

## IV3Router

Minimal V3-like router interface to unify Uniswap V3 / Pancake V3 exact-input swaps.

### ExactInputParamsV1

Parameters for an exact-input multi-hop swap.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct ExactInputParamsV1 {
  bytes path;
  address recipient;
  uint256 deadline;
  uint256 amountIn;
  uint256 amountOutMinimum;
}
```

### ExactInputParamsV2

```solidity
struct ExactInputParamsV2 {
  bytes path;
  address recipient;
  uint256 amountIn;
  uint256 amountOutMinimum;
}
```

### exactInput

```solidity
function exactInput(struct IV3Router.ExactInputParamsV1 params) external payable returns (uint256 amountOut)
```

Executes an exact-input swap along the provided path.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IV3Router.ExactInputParamsV1 | The exact-input swap parameters. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | The amount of output tokens received. |

### exactInput

```solidity
function exactInput(struct IV3Router.ExactInputParamsV2 params) external payable returns (uint256 amountOut)
```

Swaps `amountIn` of one token for as much as possible of another along the specified path

_Setting `amountIn` to 0 will cause the contract to look up its own balance,
and swap the entire amount, enabling contracts to send tokens before calling this function._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IV3Router.ExactInputParamsV2 | The parameters necessary for the multi-hop swap, encoded as `ExactInputParams` in calldata |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountOut | uint256 | The amount of the received token |

