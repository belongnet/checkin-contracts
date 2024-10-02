# Solidity API

## InvalidSignature

```solidity
error InvalidSignature()
```

Error thrown when the signature provided is invalid.

## EmptyNameSymbolPassed

```solidity
error EmptyNameSymbolPassed(string name, string symbol)
```

Error thrown when an empty name or symbol is provided for an NFT.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| name | string | The name that was passed (empty). |
| symbol | string | The symbol that was passed (empty). |

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
event NFTCreated(bytes32 _hash, struct NftInstanceInfo info)
```

Event emitted when a new NFT is created.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _hash | bytes32 | The keccak256 hash of the NFT's name and symbol. |
| info | struct NftInstanceInfo | The information about the created NFT instance. |

### getNftInstanceInfo

```solidity
mapping(bytes32 => struct NftInstanceInfo) getNftInstanceInfo
```

A mapping from keccak256(name, symbol) to the NFT instance address.

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
function initialize(struct ReferralPercentages percentages, struct NftFactoryParameters nftFactoryParameters_) external
```

Initializes the contract with NFT factory parameters and referral percentages.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| percentages | struct ReferralPercentages | The referral percentages for the system. |
| nftFactoryParameters_ | struct NftFactoryParameters | The NFT factory parameters to be set. |

### produce

```solidity
function produce(struct InstanceInfo _info, bytes32 referralCode) external returns (address nftAddress)
```

Produces a new NFT instance.

_Creates a new instance of the NFT and adds the information to the storage contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _info | struct InstanceInfo | Struct containing the details of the new NFT instance. |
| referralCode | bytes32 | The referral code associated with this NFT instance. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| nftAddress | address | The address of the created NFT instance. |

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
function setTransferValidator(address validator) external
```

Sets a new transfer validator contract.

_Can only be called by the owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| validator | address | The new transfer validator contract. |

### setReferralPercentages

```solidity
function setReferralPercentages(struct ReferralPercentages percentages) external
```

Sets the referral percentages.

_Can only be called by the owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| percentages | struct ReferralPercentages | The new referral percentages. |

### nftFactoryParameters

```solidity
function nftFactoryParameters() external view returns (struct NftFactoryParameters)
```

Returns the current NFT factory parameters.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct NftFactoryParameters | The NFT factory parameters. |

