# CLHooks
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-cl/libraries/CLHooks.sol)


## Functions
### validatePermissionsConflict

Validate hook permission, eg. if before_swap_return_delta is set, before_swap_delta must be set


```solidity
function validatePermissionsConflict(PoolKey memory key) internal pure;
```

### beforeInitialize


```solidity
function beforeInitialize(PoolKey memory key, uint160 sqrtPriceX96) internal;
```

### afterInitialize


```solidity
function afterInitialize(PoolKey memory key, uint160 sqrtPriceX96, int24 tick) internal;
```

### beforeModifyLiquidity


```solidity
function beforeModifyLiquidity(
    PoolKey memory key,
    ICLPoolManager.ModifyLiquidityParams memory params,
    bytes calldata hookData
) internal;
```

### afterModifyLiquidity


```solidity
function afterModifyLiquidity(
    PoolKey memory key,
    ICLPoolManager.ModifyLiquidityParams memory params,
    BalanceDelta delta,
    BalanceDelta feesAccrued,
    bytes calldata hookData
) internal returns (BalanceDelta callerDelta, BalanceDelta hookDelta);
```

### beforeSwap


```solidity
function beforeSwap(PoolKey memory key, ICLPoolManager.SwapParams memory params, bytes calldata hookData)
    internal
    returns (int256 amountToSwap, BeforeSwapDelta beforeSwapDelta, uint24 lpFeeOverride);
```

### afterSwap


```solidity
function afterSwap(
    PoolKey memory key,
    ICLPoolManager.SwapParams memory params,
    BalanceDelta delta,
    bytes calldata hookData,
    BeforeSwapDelta beforeSwapDelta
) internal returns (BalanceDelta, BalanceDelta);
```

### beforeDonate


```solidity
function beforeDonate(PoolKey memory key, uint256 amount0, uint256 amount1, bytes calldata hookData) internal;
```

### afterDonate


```solidity
function afterDonate(PoolKey memory key, uint256 amount0, uint256 amount1, bytes calldata hookData) internal;
```

