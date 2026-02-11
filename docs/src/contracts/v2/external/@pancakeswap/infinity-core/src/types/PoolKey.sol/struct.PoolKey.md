# PoolKey
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/types/PoolKey.sol)

Returns the key for identifying a pool


```solidity
struct PoolKey {
/// @notice The lower currency of the pool, sorted numerically
Currency currency0;
/// @notice The higher currency of the pool, sorted numerically
Currency currency1;
/// @notice The hooks of the pool, won't have a general interface because hooks interface vary on pool type
IHooks hooks;
/// @notice The pool manager of the pool
IPoolManager poolManager;
/// @notice The pool lp fee, capped at 1_000_000. If the pool has a dynamic fee then it must be exactly equal to 0x800000
uint24 fee;
/// @notice Hooks callback and pool specific parameters, i.e. tickSpacing for CL, binStep for bin
bytes32 parameters;
}
```

