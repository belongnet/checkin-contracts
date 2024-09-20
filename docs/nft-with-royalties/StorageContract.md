# Solidity API

## OnlyFactory

```solidity
error OnlyFactory()
```

Error thrown when the caller is not the factory contract.

## ZeroAddressPasted

```solidity
error ZeroAddressPasted()
```

Error thrown when a zero address is provided.

## IncorrectInstanceId

```solidity
error IncorrectInstanceId()
```

Error thrown when an incorrect instance ID is provided.

## StorageContract

A contract to store and manage instances of NFTs created by a factory.

_This contract holds information about all NFT instances and allows only the factory to add new instances._

### FactorySet

```solidity
event FactorySet(contract NFTFactory newFactory)
```

Emitted when a new factory is set.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newFactory | contract NFTFactory | The address of the newly set factory. |

### InstanceAdded

```solidity
event InstanceAdded(contract NFT newInstance)
```

Emitted when a new NFT instance is added.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newInstance | contract NFT | The address of the newly added NFT instance. |

### factory

```solidity
contract NFTFactory factory
```

The current NFT factory contract address.

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
mapping(contract NFT => struct StorageInstanceInfo) instanceInfos
```

A mapping from NFT instance address to its storage information.

### constructor

```solidity
constructor() public
```

_Initializes the contract and sets the contract deployer as the owner._

### getInstanceInfo

```solidity
function getInstanceInfo(uint256 instanceId) external view returns (struct StorageInstanceInfo instanceInfo)
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
| instanceInfo | struct StorageInstanceInfo | The information about the specified instance. |

### instancesCount

```solidity
function instancesCount() external view returns (uint256)
```

Returns the total count of NFT instances stored in the contract.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of NFT instances. |

### setFactory

```solidity
function setFactory(contract NFTFactory _factory) external
```

Sets a new factory contract address.

_Can only be called by the contract owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _factory | contract NFTFactory | The new factory contract address. |

### addInstance

```solidity
function addInstance(contract NFT nft, address creator, string name, string symbol) external returns (uint256)
```

Adds a new NFT instance to the storage.

_Can only be called by the factory contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| nft | contract NFT | The address of the new NFT instance. |
| creator | address | The address of the creator of the new instance. |
| name | string | The name of the new NFT collection. |
| symbol | string | The symbol of the new NFT collection. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total number of instances after adding the new one. |

