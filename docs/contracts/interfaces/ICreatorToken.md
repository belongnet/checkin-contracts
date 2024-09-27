# Solidity API

## ICreatorToken

Interface for managing transfer validators for tokens

_This interface allows getting and setting transfer validators and their corresponding validation functions_

### TransferValidatorUpdated

```solidity
event TransferValidatorUpdated(address oldValidator, address newValidator)
```

Emitted when the transfer validator is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| oldValidator | address | The old transfer validator address |
| newValidator | address | The new transfer validator address |

### getTransferValidator

```solidity
function getTransferValidator() external view returns (address validator)
```

Retrieves the current transfer validator contract address

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| validator | address | The address of the current transfer validator |

### getTransferValidationFunction

```solidity
function getTransferValidationFunction() external view returns (bytes4 functionSignature, bool isViewFunction)
```

Retrieves the function signature of the transfer validation function and whether it's a view function

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| functionSignature | bytes4 | The function signature of the transfer validation function |
| isViewFunction | bool | Indicates whether the transfer validation function is a view function |

### setTransferValidator

```solidity
function setTransferValidator(address validator) external
```

Sets a new transfer validator contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| validator | address | The address of the new transfer validator |

## ILegacyCreatorToken

Legacy interface for managing transfer validators for tokens

_This is a simplified version of the `ICreatorToken` interface_

### TransferValidatorUpdated

```solidity
event TransferValidatorUpdated(address oldValidator, address newValidator)
```

Emitted when the transfer validator is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| oldValidator | address | The old transfer validator address |
| newValidator | address | The new transfer validator address |

### getTransferValidator

```solidity
function getTransferValidator() external view returns (address validator)
```

Retrieves the current transfer validator contract address

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| validator | address | The address of the current transfer validator |

### setTransferValidator

```solidity
function setTransferValidator(address validator) external
```

Sets a new transfer validator contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| validator | address | The address of the new transfer validator |

