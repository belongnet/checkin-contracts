# Solidity API

## IV3Factory

Minimal V3-like factory interface to unify Uniswap V3 / Pancake V3 usage.

### getPool

```solidity
function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)
```

Returns the canonical pool address for a token pair and fee tier, or zero if none exists.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenA | address | Address of token A. |
| tokenB | address | Address of token B. |
| fee | uint24 | The pool fee tier expressed in hundredths of a bip, e.g. 500, 3000, 10000. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| pool | address | The pool address for the given pair and fee, or address(0) if not deployed. |

