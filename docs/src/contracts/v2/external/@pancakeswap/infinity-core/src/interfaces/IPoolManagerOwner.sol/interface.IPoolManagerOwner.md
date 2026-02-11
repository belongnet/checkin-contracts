# IPoolManagerOwner
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IPoolManagerOwner.sol)


## Functions
### pausePoolManager

pause pool manager, only owner or account with pausable role can call. Once
paused, no swaps, donate or add liquidity are allowed, only remove liquidity is permitted.

PCS will have security monitoring integration to pause the pool manager in case of any suspicious activity


```solidity
function pausePoolManager() external;
```

### unpausePoolManager

unpause pool manager, only owner can call


```solidity
function unpausePoolManager() external;
```

### setProtocolFeeController

set the protocol fee controller, only owner can call


```solidity
function setProtocolFeeController(IProtocolFeeController protocolFeeController) external;
```

### transferPoolManagerOwnership

transfer the ownership of pool manager to the new owner

used when a new PoolManagerOwner contract is created and we transfer pool manager owner to new contract


```solidity
function transferPoolManagerOwnership(address newPoolManagerOwner) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`newPoolManagerOwner`|`address`|the address of the new owner|


### acceptPoolManagerOwnership

accept the ownership of pool manager, only callable by the
pending pool manager owner set by latest transferPoolManagerOwnership


```solidity
function acceptPoolManagerOwnership() external;
```

### pendingPoolManagerOwner

get the current pending pool manager owner


```solidity
function pendingPoolManagerOwner() external view returns (address);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address`|the address of the pending pool manager owner|


