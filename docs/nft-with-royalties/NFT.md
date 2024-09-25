# Solidity API

## TotalSupplyLimitReached

```solidity
error TotalSupplyLimitReached()
```

Error thrown when the total supply limit is reached.

## NotEnoughETHSent

```solidity
error NotEnoughETHSent(uint256 ETHsent)
```

Error thrown when insufficient ETH is sent for a minting transaction.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ETHsent | uint256 | The amount of ETH sent. |

## NotTransferable

```solidity
error NotTransferable()
```

Error thrown when a non-transferable token is attempted to be transferred.

## InvalidSignature

```solidity
error InvalidSignature()
```

Error thrown when an invalid signature is provided for minting.

## PriceChanged

```solidity
error PriceChanged(uint256 expectedMintPrice, uint256 currentPrice)
```

Error thrown when the mint price changes unexpectedly.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| expectedMintPrice | uint256 | The expected mint price. |
| currentPrice | uint256 | The actual current mint price. |

## TokenChanged

```solidity
error TokenChanged(address expectedPayingToken, address currentPayingToken)
```

Error thrown when the paying token changes unexpectedly.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| expectedPayingToken | address | The expected paying token. |
| currentPayingToken | address | The actual paying token. |

## NFT

Implements the minting and transfer functionality for NFTs, including transfer validation and royalty management.

_This contract inherits from BaseERC721 and implements additional minting logic, including whitelist support and fee handling._

### PayingTokenChanged

```solidity
event PayingTokenChanged(address newToken, uint256 newPrice, uint256 newWLPrice)
```

Emitted when the paying token and prices are updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newToken | address | The address of the new paying token. |
| newPrice | uint256 | The new mint price. |
| newWLPrice | uint256 | The new whitelist mint price. |

### ETH_ADDRESS

```solidity
address ETH_ADDRESS
```

The constant address representing ETH.

### parameters

```solidity
struct NftParameters parameters
```

The struct containing all NFT parameters for the collection.

### constructor

```solidity
constructor(struct NftParameters _params, contract ITransferValidator721 newValidator) public
```

_Called by the factory when a new instance is deployed._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _params | struct NftParameters | Collection parameters containing information like name, symbol, fees, and more. |
| newValidator | contract ITransferValidator721 | The transfer validator contract address. |

### mint

```solidity
function mint(address receiver, uint256 tokenId, string tokenUri, bool whitelisted, bytes signature, uint256 _expectedMintPrice, address _expectedPayingToken) external payable
```

Mints a new NFT to a specified address.

_Requires a signature from a trusted address and validates against whitelist status._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | The address receiving the NFT. |
| tokenId | uint256 | The ID of the token to mint. |
| tokenUri | string | The metadata URI of the token being minted. |
| whitelisted | bool | Whether the receiver is whitelisted for a discount. |
| signature | bytes | The signature of the trusted address for validation. |
| _expectedMintPrice | uint256 | The expected mint price at the time of minting. |
| _expectedPayingToken | address | The expected paying token (ETH or another token). |

### setPayingToken

```solidity
function setPayingToken(address _payingToken, uint256 _mintPrice, uint256 _whitelistMintPrice) external
```

Sets a new paying token and mint prices for the collection.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _payingToken | address | The new paying token address. |
| _mintPrice | uint256 | The new mint price. |
| _whitelistMintPrice | uint256 | The new whitelist mint price. |

### payingToken

```solidity
function payingToken() external view returns (address)
```

Returns the paying token for the collection.

### storageContract

```solidity
function storageContract() external view returns (address)
```

Returns the address of the storage contract.

### mintPrice

```solidity
function mintPrice() external view returns (uint256)
```

Returns the current mint price for the collection.

### whitelistMintPrice

```solidity
function whitelistMintPrice() external view returns (uint256)
```

Returns the current whitelist mint price for the collection.

### transferable

```solidity
function transferable() external view returns (bool)
```

Returns whether the collection is transferable.

### maxTotalSupply

```solidity
function maxTotalSupply() external view returns (uint256)
```

Returns the maximum total supply for the collection.

### totalRoyalty

```solidity
function totalRoyalty() external view returns (uint256)
```

Returns the total royalty percentage for the collection.

### creator

```solidity
function creator() external view returns (address)
```

Returns the creator of the collection.

### collectionExpire

```solidity
function collectionExpire() external view returns (uint256)
```

Returns the expiration timestamp for the collection.

### contractURI

```solidity
function contractURI() external view returns (string)
```

Returns the contract URI for the collection.

### _update

```solidity
function _update(address to, uint256 tokenId, address auth) internal returns (address from)
```

Updates the token transfer status.

_Overrides the _update function to include transfer validation based on the collection's transferability._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The address to transfer the token to. |
| tokenId | uint256 | The token ID to transfer. |
| auth | address | The authorized caller. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The address the token is being transferred from. |

### _isSignatureValid

```solidity
function _isSignatureValid(address receiver, uint256 tokenId, string tokenUri, bool whitelisted, bytes signature, address signerAddress) internal view returns (bool)
```

Verifies if the signature is valid for the current signer address

_This function checks the signature for the provided NFT data_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | The address receiving the NFT. |
| tokenId | uint256 | The ID of the token to mint. |
| tokenUri | string | The metadata URI of the token being minted. |
| whitelisted | bool | Whether the receiver is whitelisted for a discount. |
| signature | bytes | The signature of the trusted address for validation. |
| signerAddress | address |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool Whether the signature is valid |

