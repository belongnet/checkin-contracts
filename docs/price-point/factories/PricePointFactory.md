# Solidity API

## InvalidSignature

```solidity
error InvalidSignature()
```

## EmptyNamePasted

```solidity
error EmptyNamePasted()
```

## EmptySymbolPasted

```solidity
error EmptySymbolPasted()
```

## PricePointAlreadyExists

```solidity
error PricePointAlreadyExists(bytes32 hash)
```

## ZeroAddressPasted

```solidity
error ZeroAddressPasted()
```

## PricePointFactory

A factory contract to create new PricePoint instances with specific parameters

_This contract allows producing PricePoints, managing platform settings, and verifying signatures_

### PricePointCreated

```solidity
event PricePointCreated(address user, string name, string symbol, contract PricePoint pricePoint, uint256 id)
```

Event emitted when a new PricePoint is created

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The address of the user who created the PricePoint |
| name | string | Name of the created PricePoint |
| symbol | string | Symbol of the created PricePoint |
| pricePoint | contract PricePoint | The newly created PricePoint instance |
| id | uint256 | The ID of the newly created PricePoint |

### SignerSet

```solidity
event SignerSet(address newSigner)
```

Event emitted when the signer address is set

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newSigner | address | The new signer address |

### PlatformAddressSet

```solidity
event PlatformAddressSet(address newPlatformAddress)
```

Event emitted when the platform address is set

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newPlatformAddress | address | The new platform address |

### DefaultPaymentCurrencySet

```solidity
event DefaultPaymentCurrencySet(address defaultPaymentCurrency)
```

Event emitted when the default payment currency is set

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| defaultPaymentCurrency | address | The new default payment currency |

### platformAddress

```solidity
address platformAddress
```

Platform address that is allowed to collect fees

### signerAddress

```solidity
address signerAddress
```

Address of the signer used for signature verification

### defaultPaymentCurrency

```solidity
address defaultPaymentCurrency
```

Address of the default payment currency

### pricePoints

```solidity
contract PricePoint[] pricePoints
```

An array storing all created PricePoint instances

### pricePointsByHash

```solidity
mapping(bytes32 => contract PricePoint) pricePointsByHash
```

A mapping from keccak256(name, symbol) to the PricePoint instance address

### zeroAddressCheck

```solidity
modifier zeroAddressCheck(address _address)
```

Modifier to check if the passed address is not zero

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | The address to check |

### initialize

```solidity
function initialize(address _defaultPaymentCurrency, address _signer, address _platformAddress) external
```

Initializes the contract with the default payment currency, signer, and platform address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _defaultPaymentCurrency | address | The address of the default payment currency |
| _signer | address | The address of the signer used for signature verification |
| _platformAddress | address | The address of the platform that collects fees |

### setDefaultPaymentCurrency

```solidity
function setDefaultPaymentCurrency(address _paymentCurrency) external
```

Sets the default payment currency address

_Can only be called by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _paymentCurrency | address | The new default payment currency address |

### setPlatformAddress

```solidity
function setPlatformAddress(address _platformAddress) external
```

Sets the platform address

_Can only be called by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _platformAddress | address | The new platform address |

### setSigner

```solidity
function setSigner(address _signer) external
```

Sets the signer address used for signature verification

_Can only be called by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _signer | address | The new signer address |

### produce

```solidity
function produce(struct PricePointInfo _info) external returns (contract PricePoint pricePoint)
```

Produces a new PricePoint instance

_Creates a new instance of the PricePoint and adds the information to the storage contract_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _info | struct PricePointInfo | Struct containing the details of the new PricePoint instance |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| pricePoint | contract PricePoint | The address of the created PricePoint instance |

### _isSignatureValid

```solidity
function _isSignatureValid(address user, string name, string symbol, string contractURI, bytes signature) internal view returns (bool)
```

Verifies if the signature is valid for the current signer address

_This function checks the signature for the provided NFT data_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The address of the user creating the PricePoint |
| name | string | Name of the new PricePoint instance |
| symbol | string | Symbol of the new PricePoint instance |
| contractURI | string | URI for the new PricePoint instance |
| signature | bytes | The signature to validate |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool Whether the signature is valid |

