# BinHooks
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/pool-bin/libraries/BinHooks.sol)


## Functions
### validatePermissionsConflict

Validate hook permission, eg. if before_swap_return_delta is set, before_swap_delta must be set


```solidity
function validatePermissionsConflict(PoolKey memory key) internal pure;
```

### beforeInitialize


```solidity
function beforeInitialize(PoolKey memory key, uint24 activeId) internal;
```

### afterInitialize


```solidity
function afterInitialize(PoolKey memory key, uint24 activeId) internal;
```

### beforeMint


```solidity
function beforeMint(PoolKey memory key, IBinPoolManager.MintParams calldata params, bytes calldata hookData)
    internal
    returns (uint24 lpFeeOverride);
```

### afterMint


```solidity
function afterMint(
    PoolKey memory key,
    IBinPoolManager.MintParams memory params,
    BalanceDelta delta,
    bytes calldata hookData
) internal returns (BalanceDelta callerDelta, BalanceDelta hookDelta);
```

### beforeBurn


```solidity
function beforeBurn(PoolKey memory key, IBinPoolManager.BurnParams memory params, bytes calldata hookData)
    internal;
```

### afterBurn


```solidity
function afterBurn(
    PoolKey memory key,
    IBinPoolManager.BurnParams memory params,
    BalanceDelta delta,
    bytes calldata hookData
) internal returns (BalanceDelta callerDelta, BalanceDelta hookDelta);
```

### beforeSwap


```solidity
function beforeSwap(PoolKey memory key, bool swapForY, int128 amountSpecified, bytes calldata hookData)
    internal
    returns (int128 amountToSwap, BeforeSwapDelta beforeSwapDelta, uint24 lpFeeOverride);
```

### afterSwap


```solidity
function afterSwap(
    PoolKey memory key,
    bool swapForY,
    int128 amountSpecified,
    BalanceDelta delta,
    bytes calldata hookData,
    BeforeSwapDelta beforeSwapDelta
) internal returns (BalanceDelta, BalanceDelta);
```

### beforeDonate


```solidity
function beforeDonate(PoolKey memory key, uint128 amount0, uint128 amount1, bytes calldata hookData) internal;
```

### afterDonate


```solidity
function afterDonate(PoolKey memory key, uint128 amount0, uint128 amount1, bytes calldata hookData) internal;
```

