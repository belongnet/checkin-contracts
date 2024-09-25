# Solidity API

## ZeroAddressPasted

```solidity
error ZeroAddressPasted()
```

## NotTransferable

```solidity
error NotTransferable()
```

## CanBePaidOnlyByUser

```solidity
error CanBePaidOnlyByUser(address user)
```

## InvalidSignature

```solidity
error InvalidSignature()
```

## PricePoint

This contract represents an ERC721 token that handles payments and records them via a PricePoint.

_The contract includes functionality for payment processing, signature verification, and token minting._

### CurrenciesWithdrew

```solidity
event CurrenciesWithdrew(address to)
```

Event emitted when currencies are withdrawn from the contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The address to which the currencies were withdrawn. |

### Paid

```solidity
event Paid(uint256 paymentId, address sender, address paymentCurrency, uint256 value)
```

Event emitted when a payment is made to the PricePoint.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| paymentId | uint256 | The ID of the payment made. |
| sender | address | The address that made the payment. |
| paymentCurrency | address | The currency used for the payment. |
| value | uint256 | The amount of the payment. |

### PaymentCurrencyChanged

```solidity
event PaymentCurrencyChanged(address paymentCurrency)
```

Event emitted when the payment currency is changed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| paymentCurrency | address | The new payment currency. |

### PricePointFactoryChanged

```solidity
event PricePointFactoryChanged(address factory)
```

Event emitted when the PricePoint factory is changed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| factory | address | The new PricePoint factory. |

### TransferableChanged

```solidity
event TransferableChanged(bool transferable)
```

Event emitted when the transferability of the token is changed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| transferable | bool | A boolean indicating whether the token is transferable. |

### ETH_ADDRESS

```solidity
address ETH_ADDRESS
```

Constant for representing ETH as the payment currency.

### factory

```solidity
contract PricePointFactory factory
```

Reference to the PricePointFactory contract that created this PricePoint.

### currentId

```solidity
uint256 currentId
```

The current ID for minting tokens.

### metadataUri

```solidity
mapping(uint256 => string) metadataUri
```

Mapping from token ID to its metadata URI.

### zeroAddressCheck

```solidity
modifier zeroAddressCheck(address _address)
```

Modifier to check if the provided address is not zero.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | The address to check. |

### constructor

```solidity
constructor(struct PricePointParameters params, address _factory) public
```

Constructor to initialize the PricePoint contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct PricePointParameters | The parameters for the PricePoint. |
| _factory | address | The address of the PricePointFactory that created this contract. |

### pay

```solidity
function pay(address paidBy, uint256 paymentId, string tokenUri, uint256 amount, bytes _signature) external payable
```

Function to process a payment and mint an NFT.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| paidBy | address | The address making the payment. |
| paymentId | uint256 | The ID of the payment. |
| tokenUri | string | The metadata URI for the minted NFT. |
| amount | uint256 | The amount of payment to be processed. |
| _signature | bytes | The signature verifying the payment. |

### setPaymentCurrency

```solidity
function setPaymentCurrency(address _paymentCurrency) external
```

Sets a new payment currency.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _paymentCurrency | address | The new payment currency address. |

### setTransferable

```solidity
function setTransferable(bool _transferable) external
```

Updates the transferability of the token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _transferable | bool | A boolean indicating if the tokens are transferable. |

### setFactory

```solidity
function setFactory(address _factory) external
```

Sets a new factory address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _factory | address | The new factory address. |

### getReceipt

```solidity
function getReceipt(uint256 tokenId) external view returns (uint96)
```

Retrieves the payment receipt for a specific token ID.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The ID of the token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint96 | The payment amount associated with the token. |

### user

```solidity
function user() public view returns (address)
```

Returns the user address associated with the token collection.

### symbol

```solidity
function symbol() public view returns (string)
```

Returns the symbol of the token collection.

### name

```solidity
function name() public view returns (string)
```

Returns the name of the token collection.

### contractURI

```solidity
function contractURI() external view returns (string)
```

Returns the contract URI for the collection.

### paymentCurrency

```solidity
function paymentCurrency() external view returns (address)
```

Returns the payment currency for the collection.

### transferable

```solidity
function transferable() external view returns (bool)
```

Returns the transferability status of the tokens.

### signature

```solidity
function signature() external view returns (bytes)
```

Returns the signature used for verification.

### platform

```solidity
function platform() public view returns (address)
```

Returns the platform address associated with this contract.

### tokenURI

```solidity
function tokenURI(uint256 id) public view returns (string)
```

Returns the metadata URI for a specific token ID.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The ID of the token. |

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 id) internal
```

_Overrides the default token transfer behavior to check transferability._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The address sending the token. |
| to | address | The address receiving the token. |
| id | uint256 | The ID of the token being transferred. |

### _isSignatureValid

```solidity
function _isSignatureValid(address paidBy, uint256 paymentId, string tokenUri, uint256 amount, bytes _signature, address signerAddress) internal view returns (bool)
```

Verifies if the signature is valid for the current signer address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| paidBy | address | The address making the payment. |
| paymentId | uint256 | The ID of the payment. |
| tokenUri | string | The metadata URI of the token. |
| amount | uint256 | The amount paid. |
| _signature | bytes | The signature to validate. |
| signerAddress | address | The address of the signer. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool Whether the signature is valid. |

