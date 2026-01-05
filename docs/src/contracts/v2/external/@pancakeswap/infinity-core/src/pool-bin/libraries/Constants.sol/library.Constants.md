# Constants
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/pool-bin/libraries/Constants.sol)

Set of constants for BinPool


## State Variables
### SCALE_OFFSET

```solidity
uint8 internal constant SCALE_OFFSET = 128
```


### SCALE

```solidity
uint256 internal constant SCALE = 1 << SCALE_OFFSET
```


### PRECISION

```solidity
uint256 internal constant PRECISION = 1e18
```


### SQUARED_PRECISION

```solidity
uint256 internal constant SQUARED_PRECISION = PRECISION * PRECISION
```


### BASIS_POINT_MAX

```solidity
uint256 internal constant BASIS_POINT_MAX = 10_000
```


### MAX_LIQUIDITY_PER_BIN

```solidity
uint256 internal constant MAX_LIQUIDITY_PER_BIN =
    65251743116719673010965625540244653191619923014385985379600384103134737
```


