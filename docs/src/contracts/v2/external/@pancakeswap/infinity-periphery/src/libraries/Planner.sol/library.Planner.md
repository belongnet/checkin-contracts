# Planner
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/libraries/Planner.sol)

Constructs a plan of actions to be executed on Pancakeswap infinity.


## Functions
### init


```solidity
function init() internal pure returns (Plan memory plan);
```

### add


```solidity
function add(Plan memory plan, uint256 action, bytes memory param) internal pure returns (Plan memory);
```

### finalizeModifyLiquidityWithTake


```solidity
function finalizeModifyLiquidityWithTake(Plan memory plan, PoolKey memory poolKey, address takeRecipient)
    internal
    pure
    returns (bytes memory);
```

### finalizeModifyLiquidityWithClose


```solidity
function finalizeModifyLiquidityWithClose(Plan memory plan, PoolKey memory poolKey)
    internal
    pure
    returns (bytes memory);
```

### finalizeModifyLiquidityWithSettlePair


```solidity
function finalizeModifyLiquidityWithSettlePair(Plan memory plan, PoolKey memory poolKey)
    internal
    pure
    returns (bytes memory);
```

### finalizeModifyLiquidityWithTakePair


```solidity
function finalizeModifyLiquidityWithTakePair(Plan memory plan, PoolKey memory poolKey, address takeRecipient)
    internal
    pure
    returns (bytes memory);
```

### encode


```solidity
function encode(Plan memory plan) internal pure returns (bytes memory);
```

### finalizeSwap


```solidity
function finalizeSwap(Plan memory plan, Currency inputCurrency, Currency outputCurrency, address takeRecipient)
    internal
    pure
    returns (bytes memory);
```

