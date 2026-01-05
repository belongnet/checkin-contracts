# BalanceDelta
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/types/BalanceDelta.sol)

Two `int128` values packed into a single `int256` where the upper 128 bits represent the amount0
and the lower 128 bits represent the amount1.


```solidity
type BalanceDelta is int256
```

