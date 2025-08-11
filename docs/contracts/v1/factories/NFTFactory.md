# Solidity API

## NFTAlreadyExists

```solidity
error NFTAlreadyExists()
```

Error thrown when an NFT with the same name and symbol already exists.

## NftFactoryParameters

A struct that contains parameters related to the NFT factory, such as platform and commission details.

_This struct is used to store key configuration information for the NFT factory._

```solidity
struct NftFactoryParameters {
  address platformAddress;
  address signerAddress;
  address defaultPaymentCurrency;
  uint256 platformCommission;
  uint256 maxArraySize;
  address transferValidator;
}
```

## NftMetadata

```solidity
struct NftMetadata {
  string name;
  string symbol;
}
```

## InstanceInfo

A struct that holds detailed information about an individual NFT collection, such as name, symbol, and pricing.

_This struct is used to store key metadata and configuration information for each NFT collection._

```solidity
struct InstanceInfo {
  address payingToken;
  uint96 feeNumerator;
  bool transferable;
  uint256 maxTotalSupply;
  uint256 mintPrice;
  uint256 whitelistMintPrice;
  uint256 collectionExpire;
  struct NftMetadata metadata;
  string contractURI;
  bytes signature;
}
```

## NftInstanceInfo

A simplified struct that holds only the basic information of the NFT collection, such as name, symbol, and creator.

_This struct is used for lightweight storage of NFT collection metadata._

```solidity
struct NftInstanceInfo {
  address creator;
  address nftAddress;
  address royaltiesReceiver;
  struct NftMetadata metadata;
}
```

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

### FactoryParametersSet

```solidity
event FactoryParametersSet(struct NftFactoryParameters nftFactoryParameters, uint16[5] percentages)
```

Event emitted when the new factory parameters set.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| nftFactoryParameters | struct NftFactoryParameters | The NFT factory parameters to be set. |
| percentages | uint16[5] | The referral percentages for the system. |

### getNftInstanceInfo

```solidity
mapping(bytes32 => struct NftInstanceInfo) getNftInstanceInfo
```

A mapping from keccak256(name, symbol) to the NFT instance address.

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(struct NftFactoryParameters nftFactoryParameters_, uint16[5] percentages) external
```

Initializes the contract with NFT factory parameters and referral percentages.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| nftFactoryParameters_ | struct NftFactoryParameters | The NFT factory parameters to be set. |
| percentages | uint16[5] | The referral percentages for the system. |

### produce

```solidity
function produce(struct InstanceInfo _info, bytes32 referralCode) external returns (address nftAddress)
```

Produces a new NFT i nstance.

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
function setFactoryParameters(struct NftFactoryParameters nftFactoryParameters_, uint16[5] percentages) external
```

Sets new factory parameters.

_Can only be called by the owner (BE)._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| nftFactoryParameters_ | struct NftFactoryParameters | The NFT factory parameters to be set. |
| percentages | uint16[5] | An array containing the referral percentages for initial, second, third, and default use. |

### nftFactoryParameters

```solidity
function nftFactoryParameters() external view returns (struct NftFactoryParameters)
```

Returns the current NFT factory parameters.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct NftFactoryParameters | The NFT factory parameters. |

