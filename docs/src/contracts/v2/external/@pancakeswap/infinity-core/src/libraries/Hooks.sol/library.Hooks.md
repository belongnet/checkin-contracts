# Hooks
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/libraries/Hooks.sol)

**Title:**
Hooks library

It provides some general helper functions that are used by the poolManager when verifying hook permissions, interacting with hooks, etc.


## Functions
### validateHookConfig

Utility function intended to be used in pool initialization to ensure
the hook contract's hooks registration bitmap match the configration in the pool key


```solidity
function validateHookConfig(PoolKey memory poolKey) internal view;
```

### hasOffsetEnabled


```solidity
function hasOffsetEnabled(bytes32 parameters, uint8 offset) internal pure returns (bool);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|true if parameter has offset enabled|


### shouldCall

checks if hook should be called -- based on 2 factors:
1. whether pool.parameters has the callback offset registered
2. whether msg.sender is the hook itself


```solidity
function shouldCall(bytes32 parameters, uint8 offset, IHooks hook) internal view returns (bool);
```

### callHook

performs a hook call using the given calldata on the given hook that doesnt return a delta


```solidity
function callHook(IHooks self, bytes memory data) internal returns (bytes memory result);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`result`|`bytes`|The complete data returned by the hook|


### callHookWithReturnDelta

performs a hook call using the given calldata on the given hook


```solidity
function callHookWithReturnDelta(IHooks self, bytes memory data, bool parseReturn) internal returns (int256 delta);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`delta`|`int256`|The delta returned by the hook|


## Errors
### HookCallFailed
Additional context for ERC-7751 wrapped error when a hook call fails


```solidity
error HookCallFailed();
```

### HookPermissionsValidationError
Hook permissions contain conflict
1. enabled beforeSwapReturnsDelta, but lacking beforeSwap call
2. enabled afterSwapReturnsDelta, but lacking afterSwap call
3. enabled addLiquidityReturnsDelta/mintReturnsDelta, but lacking addLiquidity/mint call
4. enabled removeLiquidityReturnsDelta/burnReturnsDelta, but lacking removeLiquidityburn call


```solidity
error HookPermissionsValidationError();
```

### HookConfigValidationError
Hook config validation failed
1. either registration bitmap mismatch
2. or fee related config misconfigured


```solidity
error HookConfigValidationError();
```

### InvalidHookResponse
Hook did not return its selector


```solidity
error InvalidHookResponse();
```

### HookDeltaExceedsSwapAmount
Hook delta exceeds swap amount


```solidity
error HookDeltaExceedsSwapAmount();
```

