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

### PlatformParametersSet

```solidity
event PlatformParametersSet(address newPlatformAddress, uint256 newCommission)
```

Event emitted when the platform address and commission is set.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newPlatformAddress | address | The new platform address. |
| newCommission | uint256 | The new platform commission in basis points. |

### FactoryParametersSet

```solidity
event FactoryParametersSet(address newSigner, address defaultPaymentCurrency, address newValidator, uint256 arraySize)
```

Event emitted when the new factory parameters set.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newSigner | address | The new signer address. |
| defaultPaymentCurrency | address | The new default payment currency. |
| newValidator | address | The new transfer validator contract. |
| arraySize | uint256 | The new maximum array size. |

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

### setFactoryParameters

```solidity
function setFactoryParameters(address _signer, address _paymentCurrency, address _validator, uint256 _arraySize, struct ReferralPercentages percentages) external
```

Sets new factory parameters.

_Can only be called by the owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _signer | address | The new signer address. |
| _paymentCurrency | address | The new default payment currency address. |
| _validator | address | The new transfer validator contract. |
| _arraySize | uint256 | The new maximum array size. |
| percentages | struct ReferralPercentages |  |

### setPlatformParameters

```solidity
function setPlatformParameters(address _platformAddress, uint256 _platformCommission) external
```

Sets a new platform address and commission.

_Can only be called by the owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _platformAddress | address | The new platform address. |
| _platformCommission | uint256 | The new platform commission in basis points. |

### nftFactoryParameters

```solidity
function nftFactoryParameters() external view returns (struct NftFactoryParameters)
```

Returns the current NFT factory parameters.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct NftFactoryParameters | The NFT factory parameters. |

