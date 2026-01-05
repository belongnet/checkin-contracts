# IPositionManager
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/IPositionManager.sol)

**Inherits:**
[IImmutableState](/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/IImmutableState.sol/interface.IImmutableState.md)

**Title:**
IPositionManager

Interface for the PositionManager contract


## Functions
### modifyLiquidities

Unlocks Vault and batches actions for modifying liquidity

This is the standard entrypoint for the PositionManager


```solidity
function modifyLiquidities(bytes calldata payload, uint256 deadline) external payable;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`payload`|`bytes`|is an encoding of actions, and parameters for those actions|
|`deadline`|`uint256`|is the deadline for the batched actions to be executed|


### modifyLiquiditiesWithoutLock

Batches actions for modifying liquidity without getting a lock from vault

This must be called by a contract that has already locked the vault


```solidity
function modifyLiquiditiesWithoutLock(bytes calldata actions, bytes[] calldata params) external payable;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`actions`|`bytes`|the actions to perform|
|`params`|`bytes[]`|the parameters to provide for the actions|


## Errors
### DeadlinePassed
Thrown when the block.timestamp exceeds the user-provided deadline


```solidity
error DeadlinePassed(uint256 deadline);
```

### VaultMustBeUnlocked
Thrown when calling transfer, subscribe, or unsubscribe on CLPositionManager
or batchTransferFrom on BinPositionManager when the vault is locked.

This is to prevent hooks from being able to trigger actions or notifications at the same time the position is being modified.


```solidity
error VaultMustBeUnlocked();
```

### InvalidTokenID
Thrown when the token ID is bind to an unexisting pool


```solidity
error InvalidTokenID();
```

