# ILockCallback
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/ILockCallback.sol)

Interface for the callback executed when an address locks the vault


## Functions
### lockAcquired

Called by the pool manager on `msg.sender` when a lock is acquired


```solidity
function lockAcquired(bytes calldata data) external returns (bytes memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`data`|`bytes`|The data that was passed to the call to lock|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes`|Any data that you want to be returned from the lock call|


