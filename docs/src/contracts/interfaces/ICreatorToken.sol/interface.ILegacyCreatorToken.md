# ILegacyCreatorToken
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/interfaces/ICreatorToken.sol)

**Title:**
ILegacyCreatorToken Interface

Legacy interface for managing transfer validators for tokens

This is a simplified version of the `ICreatorToken` interface


## Functions
### getTransferValidator

Retrieves the current transfer validator contract address


```solidity
function getTransferValidator() external view returns (address validator);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`validator`|`address`|The address of the current transfer validator|


### setTransferValidator

Sets a new transfer validator contract


```solidity
function setTransferValidator(address validator) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`validator`|`address`|The address of the new transfer validator|


## Events
### TransferValidatorUpdated
Emitted when the transfer validator is updated


```solidity
event TransferValidatorUpdated(address oldValidator, address newValidator);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`oldValidator`|`address`|The old transfer validator address|
|`newValidator`|`address`|The new transfer validator address|

