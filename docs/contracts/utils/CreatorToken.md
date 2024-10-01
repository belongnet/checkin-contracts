# Solidity API

## SetTransferValidatorError

```solidity
error SetTransferValidatorError()
```

Thrown when trying to set a transfer validator to the same address.

_This error prevents setting a validator that is already active._

## ZeroAddressPassed

```solidity
error ZeroAddressPassed()
```

Thrown when attempting to set a zero address as the transfer validator.

_This error prevents setting an invalid address._

## CreatorToken

Contract that enables the use of a transfer validator to validate token transfers.

_The contract stores a reference to the transfer validator and provides functionality for setting and using it._

### TransferValidatorUpdated

```solidity
event TransferValidatorUpdated(contract ITransferValidator721 oldValidator, contract ITransferValidator721 newValidator)
```

Emitted when the transfer validator is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| oldValidator | contract ITransferValidator721 | The old transfer validator address. |
| newValidator | contract ITransferValidator721 | The new transfer validator address. |

### CannotSetTokenTypeOfCollection

```solidity
event CannotSetTokenTypeOfCollection()
```

Emitted when the collection's token type cannot be set by the transfer validator.

### _transferValidator

```solidity
contract ITransferValidator721 _transferValidator
```

_The current transfer validator. The null address indicates no validator is set._

### getTransferValidator

```solidity
function getTransferValidator() external view returns (contract ITransferValidator721)
```

Returns the currently active transfer validator.

_If the return value is the null address, no transfer validator is set._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract ITransferValidator721 | The address of the currently active transfer validator. |

### getTransferValidationFunction

```solidity
function getTransferValidationFunction() external pure returns (bytes4 functionSignature, bool isViewFunction)
```

Returns the transfer validation function and whether it is a view function.

_This returns the function selector of `validateTransfer` from the `ITransferValidator721` interface._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| functionSignature | bytes4 | The selector of the transfer validation function. |
| isViewFunction | bool | True if the transfer validation function is a view function. |

### _setTransferValidator

```solidity
function _setTransferValidator(address _newValidator) internal
```

Sets a new transfer validator.

_The external method calling this function must include access control, such as onlyOwner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newValidator | address | The address of the new transfer validator contract. |

### _validateTransfer

```solidity
function _validateTransfer(address caller, address from, address to, uint256 tokenId) internal
```

Validates a transfer using the transfer validator, if one is set.

_If no transfer validator is set or the caller is the transfer validator, no validation occurs._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | The address initiating the transfer. |
| from | address | The address transferring the token. |
| to | address | The address receiving the token. |
| tokenId | uint256 | The ID of the token being transferred. |

