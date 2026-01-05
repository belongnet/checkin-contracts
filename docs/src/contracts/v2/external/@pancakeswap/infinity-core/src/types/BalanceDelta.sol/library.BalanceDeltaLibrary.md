# BalanceDeltaLibrary
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/types/BalanceDelta.sol)

Library for getting the amount0 and amount1 deltas from the BalanceDelta type


## State Variables
### ZERO_DELTA
Constant for a BalanceDelta of zero value


```solidity
BalanceDelta public constant ZERO_DELTA = BalanceDelta.wrap(0)
```


## Functions
### amount0


```solidity
function amount0(BalanceDelta balanceDelta) internal pure returns (int128 _amount0);
```

### amount1


```solidity
function amount1(BalanceDelta balanceDelta) internal pure returns (int128 _amount1);
```

