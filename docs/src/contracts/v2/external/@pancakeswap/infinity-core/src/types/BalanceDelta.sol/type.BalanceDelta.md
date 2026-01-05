# BalanceDelta
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/types/BalanceDelta.sol)

Two `int128` values packed into a single `int256` where the upper 128 bits represent the amount0
and the lower 128 bits represent the amount1.


```solidity
type BalanceDelta is int256
```

