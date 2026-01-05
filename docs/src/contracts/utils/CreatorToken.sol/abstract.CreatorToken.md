# CreatorToken
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/utils/CreatorToken.sol)

**Title:**
CreatorToken

Contract that enables the use of a transfer validator to validate token transfers.

The contract stores a reference to the transfer validator and provides functionality for setting and using it.


## State Variables
### ERC721_TOKEN_TYPE

```solidity
uint16 internal constant ERC721_TOKEN_TYPE = 721
```


### _transferValidator
The current transfer validator. The null address indicates no validator is set.


```solidity
address internal _transferValidator
```


## Functions
### getTransferValidator

Returns the currently active transfer validator.

If the return value is the null address, no transfer validator is set.


```solidity
function getTransferValidator() external view returns (ITransferValidator721);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`ITransferValidator721`|The address of the currently active transfer validator.|


### getTransferValidationFunction

Returns the transfer validation function and whether it is a view function.

This returns the function selector of `validateTransfer` from the `ITransferValidator721` interface.


```solidity
function getTransferValidationFunction() external pure returns (bytes4 functionSignature, bool isViewFunction);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`functionSignature`|`bytes4`|The selector of the transfer validation function.|
|`isViewFunction`|`bool`|True if the transfer validation function is a view function.|


### _setTransferValidator

Sets a new transfer validator.

The external method calling this function must include access control, such as onlyOwner.


```solidity
function _setTransferValidator(address _newValidator) internal;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_newValidator`|`address`|The address of the new transfer validator contract.|


### _validateTransfer

Validates a transfer using the transfer validator, if one is set.

If no transfer validator is set or the caller is the transfer validator, no validation occurs.


```solidity
function _validateTransfer(address caller, address from, address to, uint256 tokenId) internal;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`caller`|`address`|The address initiating the transfer.|
|`from`|`address`|The address transferring the token.|
|`to`|`address`|The address receiving the token.|
|`tokenId`|`uint256`|The ID of the token being transferred.|


## Events
### TransferValidatorUpdated
Emitted when the transfer validator is updated.


```solidity
event TransferValidatorUpdated(address newValidator);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`newValidator`|`address`|The new transfer validator address.|

### TokenTypeOfCollectionSet
Emitted when the collection's token type cannot be set by the transfer validator.


```solidity
event TokenTypeOfCollectionSet(bool isSet);
```

