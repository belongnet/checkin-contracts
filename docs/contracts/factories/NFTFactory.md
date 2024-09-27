# Solidity API

## InvalidSignature

```solidity
error InvalidSignature()
```

Error thrown when the signature provided is invalid.

## EmptyNamePassed

```solidity
error EmptyNamePassed()
```

Error thrown when an empty name is provided for an NFT.

## EmptySymbolPassed

```solidity
error EmptySymbolPassed()
```

Error thrown when an empty symbol is provided for an NFT.

## NFTAlreadyExists

```solidity
error NFTAlreadyExists()
```

Error thrown when an NFT with the same name and symbol already exists.

## ZeroAddressPassed

```solidity
error ZeroAddressPassed()
```

Error thrown when a zero address is passed where it's not allowed.

## IncorrectInstanceId

```solidity
error IncorrectInstanceId()
```

Error thrown when an incorrect instance ID is provided.

## NFTFactory

A factory contract to create new NFT instances with specific parameters.

_This contract allows producing NFTs, managing platform settings, and verifying signatures._

### NFTCreated

```solidity
event NFTCreated(string name, string symbol, contract NFT instance, uint256 id)
```

Event emitted when a new NFT is created.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| name | string | Name of the created NFT. |
| symbol | string | Symbol of the created NFT. |
| instance | contract NFT | The address of the created NFT instance. |
| id | uint256 | The ID of the newly created NFT. |

### SignerSet

```solidity
event SignerSet(address newSigner)
```

Event emitted when the signer address is set.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newSigner | address | The new signer address. |

### PlatformCommissionSet

```solidity
event PlatformCommissionSet(uint256 newCommission)
```

Event emitted when the platform commission is set.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newCommission | uint256 | The new platform commission in basis points. |

### PlatformAddressSet

```solidity
event PlatformAddressSet(address newPlatformAddress)
```

Event emitted when the platform address is set.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newPlatformAddress | address | The new platform address. |

### TransferValidatorSet

```solidity
event TransferValidatorSet(contract ITransferValidator721 newValidator)
```

Event emitted when the transfer validator is set.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValidator | contract ITransferValidator721 | The new transfer validator contract. |

### DefaultPaymentCurrencySet

```solidity
event DefaultPaymentCurrencySet(address defaultPaymentCurrency)
```

Event emitted when the default payment currency is set.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| defaultPaymentCurrency | address | The new default payment currency. |

### MaxArraySizeSet

```solidity
event MaxArraySizeSet(uint256 arraySize)
```

Event emitted when the maximum array size is set.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| arraySize | uint256 | The new maximum array size. |

### transferValidator

```solidity
contract ITransferValidator721 transferValidator
```

The current transfer validator contract.

### instances

```solidity
contract NFT[] instances
```

An array storing all created NFT instances.

### getInstance

```solidity
mapping(bytes32 => contract NFT) getInstance
```

A mapping from keccak256(name, symbol) to the NFT instance address.

### instanceInfos

```solidity
mapping(contract NFT => struct NftParamsInfo) instanceInfos
```

A mapping from NFT instance address to its storage information.

### zeroAddressCheck

```solidity
modifier zeroAddressCheck(address _address)
```

Modifier to check if the passed address is not zero.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | The address to check. |

### initialize

```solidity
function initialize(struct NftFactoryInfo info, contract ITransferValidator721 validator) external
```

Initializes the contract with NFT factory info and validator.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| info | struct NftFactoryInfo | The info of NFTFactory. |
| validator | contract ITransferValidator721 | The transfer validator contract. |

### setDefaultPaymentCurrency

```solidity
function setDefaultPaymentCurrency(address _paymentCurrency) external
```

Sets the default payment currency address.

_Can only be called by the owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _paymentCurrency | address | The new default payment currency address. |

### setMaxArraySize

```solidity
function setMaxArraySize(uint256 _arraySize) external
```

Sets a new maximum array size.

_Can only be called by the owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _arraySize | uint256 | The new maximum array size. |

### setPlatformCommission

```solidity
function setPlatformCommission(uint256 _platformCommission) external
```

Sets a new platform commission.

_Can only be called by the owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _platformCommission | uint256 | The new platform commission in basis points. |

### setPlatformAddress

```solidity
function setPlatformAddress(address _platformAddress) external
```

Sets a new platform address.

_Can only be called by the owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _platformAddress | address | The new platform address. |

### setSigner

```solidity
function setSigner(address _signer) external
```

Sets a new signer address.

_Can only be called by the owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _signer | address | The new signer address. |

### setTransferValidator

```solidity
function setTransferValidator(contract ITransferValidator721 validator) external
```

Sets a new transfer validator contract.

_Can only be called by the owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| validator | contract ITransferValidator721 | The new transfer validator contract. |

### produce

```solidity
function produce(struct InstanceInfo info) external returns (contract NFT nft)
```

Produces a new NFT instance.

_Creates a new instance of the NFT and adds the information to the storage contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| info | struct InstanceInfo | Struct containing the details of the new NFT instance. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| nft | contract NFT | The address of the created NFT instance. |

### getInstanceInfo

```solidity
function getInstanceInfo(uint256 instanceId) external view returns (struct NftParamsInfo)
```

Retrieves information about a specific NFT instance.

_Reverts with `IncorrectInstanceId` if the provided ID is invalid._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| instanceId | uint256 | The ID of the NFT instance. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct NftParamsInfo | instanceInfo The information about the specified instance. |

### platformAddress

```solidity
function platformAddress() external view returns (address)
```

Returns the total count of NFT instances stored in the contract.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The number of NFT instances. |

### signerAddress

```solidity
function signerAddress() external view returns (address)
```

Returns the total count of NFT instances stored in the contract.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The number of NFT instances. |

### defaultPaymentCurrency

```solidity
function defaultPaymentCurrency() external view returns (address)
```

Returns the total count of NFT instances stored in the contract.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The number of NFT instances. |

### platformCommission

```solidity
function platformCommission() external view returns (uint256)
```

Returns the total count of NFT instances stored in the contract.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of NFT instances. |

### maxArraySize

```solidity
function maxArraySize() external view returns (uint256)
```

Returns the max array size.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The max array size. |

### instancesCount

```solidity
function instancesCount() external view returns (uint256)
```

Returns the total count of NFT instances stored in the contract.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of NFT instances. |

### _isSignatureValid

```solidity
function _isSignatureValid(struct InstanceInfo info) internal view returns (bool)
```

Verifies if the signature is valid for the current signer address.

_This function checks the signature for the provided NFT data._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| info | struct InstanceInfo | Struct containing the details of the new NFT instance. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool Whether the signature is valid. |

