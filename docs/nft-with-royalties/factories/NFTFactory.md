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

## NFTAlreadyExists

```solidity
error NFTAlreadyExists()
```

## NFTCreationFailed

```solidity
error NFTCreationFailed()
```

## ZeroAddressPasted

```solidity
error ZeroAddressPasted()
```

## NFTFactory

A factory contract to create new NFT instances with specific parameters

_This contract allows producing NFTs, managing platform settings, and verifying signatures_

### NFTCreated

```solidity
event NFTCreated(string name, string symbol, contract NFT instance, uint256 id)
```

Event emitted when a new NFT is created

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| name | string | Name of the created NFT |
| symbol | string | Symbol of the created NFT |
| instance | contract NFT | The address of the created NFT instance |
| id | uint256 | The ID of the newly created NFT |

### SignerSet

```solidity
event SignerSet(address newSigner)
```

Event emitted when the signer address is set

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newSigner | address | The new signer address |

### PlatformComissionSet

```solidity
event PlatformComissionSet(uint8 newComission)
```

Event emitted when the platform commission is set

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newComission | uint8 | The new platform commission in BPs (basis points) |

### PlatformAddressSet

```solidity
event PlatformAddressSet(address newPlatformAddress)
```

Event emitted when the platform address is set

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newPlatformAddress | address | The new platform address |

### TransferValidatorSet

```solidity
event TransferValidatorSet(contract ITransferValidator721 newValidator)
```

Event emitted when the transfer validator is set

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValidator | contract ITransferValidator721 | The new transfer validator contract |

### transferValidator

```solidity
contract ITransferValidator721 transferValidator
```

Ethereum: 0x721C0078c2328597Ca70F5451ffF5A7B38D4E947
BASE/OP: 0x721C0078c2328597Ca70F5451ffF5A7B38D4E947
Polygon/Poygon zkEVM: 0x721C0078c2328597Ca70F5451ffF5A7B38D4E947
BSC: 0x721C0078c2328597Ca70F5451ffF5A7B38D4E947
Ethereum Sepolia: 0x721C0078c2328597Ca70F5451ffF5A7B38D4E947

### platformAddress

```solidity
address platformAddress
```

Platform address that is allowed to collect fees

### storageContract

```solidity
address storageContract
```

Address of the storage contract used to store NFT instances

### signerAddress

```solidity
address signerAddress
```

Address of the signer used for signature verification

### platformCommission

```solidity
uint8 platformCommission
```

The platform commission in BPs

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
function initialize(address _signer, address _platformAddress, uint8 _platformCommission, address _storageContract, contract ITransferValidator721 validator) external
```

Initializes the contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _signer | address | The address of the signer |
| _platformAddress | address | The address of the platform that collects fees |
| _platformCommission | uint8 | The platform commission in BPs |
| _storageContract | address | The address of the storage contract |
| validator | contract ITransferValidator721 | The transfer validator contract |

### setPlatformCommission

```solidity
function setPlatformCommission(uint8 _platformCommission) external
```

Sets new platform commission

_Can only be called by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _platformCommission | uint8 | The new platform commission in BPs |

### setPlatformAddress

```solidity
function setPlatformAddress(address _platformAddress) external
```

Sets new platform address

_Can only be called by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _platformAddress | address | The new platform address |

### setSigner

```solidity
function setSigner(address _signer) external
```

Sets new signer address

_Can only be called by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _signer | address | The new signer address |

### setTransferValidator

```solidity
function setTransferValidator(contract ITransferValidator721 validator) external
```

Sets new transfer validator contract

_Can only be called by the owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| validator | contract ITransferValidator721 | The new transfer validator contract |

### produce

```solidity
function produce(struct InstanceInfo _info) external returns (contract NFT nft)
```

Produces a new NFT instance

_Creates a new instance of the NFT and adds the information to the storage contract_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _info | struct InstanceInfo | Struct containing the details of the new NFT instance |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| nft | contract NFT | The address of the created NFT instance |

### _isSignatureValid

```solidity
function _isSignatureValid(string name, string symbol, string contractURI, uint96 feeNumerator, address feeReceiver, bytes signature) internal view returns (bool)
```

Verifies if the signature is valid for the current signer address

_This function checks the signature for the provided NFT data_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| name | string | Name of the new NFT instance |
| symbol | string | Symbol of the new NFT instance |
| contractURI | string | URI for the new contract |
| feeNumerator | uint96 | Fee numerator for ERC2981 (royalties) |
| feeReceiver | address | Address to receive the fees |
| signature | bytes | The signature to validate |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool Whether the signature is valid |

