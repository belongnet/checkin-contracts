# Solidity API

## ZeroAddressPassed

```solidity
error ZeroAddressPassed()
```

Thrown when a zero address is provided where it's not allowed.

## NotTransferable

```solidity
error NotTransferable()
```

Thrown when an unauthorized transfer attempt is made.

## TotalSupplyLimitReached

```solidity
error TotalSupplyLimitReached()
```

Error thrown when the total supply limit is reached.

## BaseERC721

A base contract for ERC721 tokens that supports royalties, transfer validation, and metadata management.

_This contract extends the Solady ERC721, ERC2981, Ownable contracts, and includes transfer validation features._

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

### totalSupply

```solidity
uint256 totalSupply
```

The current total supply of tokens.

### metadataUri

```solidity
mapping(uint256 => string) metadataUri
```

Mapping of token ID to its metadata URI.

### creationTs

```solidity
mapping(uint256 => uint256) creationTs
```

Mapping of token ID to its creation timestamp.

### parameters

```solidity
struct NftParameters parameters
```

The struct containing all NFT parameters for the collection.

### constructor

```solidity
constructor(struct NftParameters _params) internal
```

Constructor for BaseERC721.

_Initializes the contract with the given parameters, sets royalty information, and the transfer validator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _params | struct NftParameters | The NFT parameters struct containing details like name, symbol, fee receiver, etc. |

### setTransferValidator

```solidity
function setTransferValidator(address newValidator) external
```

Sets a new transfer validator for the token.

_Can only be called by the contract owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValidator | address | The new transfer validator contract. |

### setAutomaticApprovalOfTransfersFromValidator

```solidity
function setAutomaticApprovalOfTransfersFromValidator(bool autoApprove) external
```

Sets whether the transfer validator is automatically approved as an operator for all token owners.

_Can only be called by the contract owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| autoApprove | bool | If true, the transfer validator will be automatically approved for all token holders. |

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

### isApprovedForAll

```solidity
function isApprovedForAll(address _owner, address operator) public view returns (bool isApproved)
```

Checks if an operator is approved to manage all tokens of a given owner.

_Overrides the default behavior to automatically approve the transfer validator if enabled._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | The owner of the tokens. |
| operator | address | The operator trying to manage the tokens. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isApproved | bool | Whether the operator is approved for all tokens of the owner. |

### tokenURI

```solidity
function tokenURI(uint256 _tokenId) public view returns (string)
```

Returns the metadata URI for a specific token ID.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The ID of the token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | The metadata URI associated with the given token ID. |

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

### factory

```solidity
function factory() external view returns (address)
```

Returns the address of the factory contract.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The factory contract address. |

### name

```solidity
function name() public view returns (string)
```

Returns the name of the token collection.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | The name of the token. |

### symbol

```solidity
function symbol() public view returns (string)
```

Returns the symbol of the token collection.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | The symbol of the token. |

### contractURI

```solidity
function contractURI() external view returns (string)
```

Returns the contract URI for the collection.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | The contract URI. |

### payingToken

```solidity
function payingToken() external view returns (address)
```

Returns the paying token for the collection.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The paying token address. |

### feeReceiver

```solidity
function feeReceiver() external view returns (address)
```

Returns the fee receiver address for the collection.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The fee receiver address. |

### totalRoyalty

```solidity
function totalRoyalty() external view returns (uint256)
```

Returns the total royalty percentage for the collection.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total royalty percentage. |

### transferable

```solidity
function transferable() external view returns (bool)
```

Returns whether the collection is transferable.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the collection is transferable, false otherwise. |

### maxTotalSupply

```solidity
function maxTotalSupply() external view returns (uint256)
```

Returns the maximum total supply for the collection.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The maximum total supply. |

### mintPrice

```solidity
function mintPrice() external view returns (uint256)
```

Returns the current mint price for the collection.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The current mint price. |

### whitelistMintPrice

```solidity
function whitelistMintPrice() external view returns (uint256)
```

Returns the current whitelist mint price for the collection.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The current whitelist mint price. |

### collectionExpire

```solidity
function collectionExpire() external view returns (uint256)
```

Returns the expiration timestamp for the collection.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The collection expiration timestamp. |

### creator

```solidity
function creator() external view returns (address)
```

Returns the creator of the collection.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The creator's address. |

### refferalCodeCreator

```solidity
function refferalCodeCreator() external view returns (bytes32)
```

Returns the referral code of the creator.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | The referral code of the creator. |

### _baseMint

```solidity
function _baseMint(uint256 tokenId, address to, string tokenUri) internal
```

Mints a new token and assigns it to a specified address.

_Increases totalSupply, stores metadata URI, and creation timestamp._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The ID of the token to be minted. |
| to | address | The address that will receive the newly minted token. |
| tokenUri | string | The metadata URI associated with the token. |

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 id) internal
```

_Hook that is called before any token transfers, including minting and burning._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The address tokens are being transferred from. |
| to | address | The address tokens are being transferred to. |
| id | uint256 | The token ID being transferred. |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```

Checks if the contract supports a given interface.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| interfaceId | bytes4 | The interface ID to check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether the interface is supported by the contract. |

