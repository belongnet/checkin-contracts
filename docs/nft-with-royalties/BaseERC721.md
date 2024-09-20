# Solidity API

## ZeroAddressPasted

```solidity
error ZeroAddressPasted()
```

Thrown when a zero address is provided where it's not allowed.

## NotTransferable

```solidity
error NotTransferable()
```

Thrown when an unauthorized transfer attempt is made.

## BaseERC721

A base contract for ERC721 tokens that supports royalties, transfer validation, and metadata management.

_This contract extends the OpenZeppelin ERC721Royalty and Solady Ownable contracts and adds support for transfer validation._

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

### zeroAddressCheck

```solidity
modifier zeroAddressCheck(address _address)
```

Modifier to check if the provided address is not a zero address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | The address to check. |

### constructor

```solidity
constructor(struct NftParameters _params, contract ITransferValidator721 newValidator) internal
```

Constructor for BaseERC721.

_Initializes the contract with the given parameters, sets royalty information, and the transfer validator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _params | struct NftParameters | The NFT parameters struct containing details like name, symbol, fee receiver, etc. |
| newValidator | contract ITransferValidator721 | The address of the transfer validator. |

### setTransferValidator

```solidity
function setTransferValidator(contract ITransferValidator721 newValidator) external
```

Sets a new transfer validator for the token.

_Can only be called by the contract owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValidator | contract ITransferValidator721 | The new transfer validator contract. |

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

### isApprovedForAll

```solidity
function isApprovedForAll(address _owner, address operator) public view virtual returns (bool isApproved)
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

### _update

```solidity
function _update(address to, uint256 tokenId, address auth) internal virtual returns (address from)
```

Internal function to handle updates during transfers.

_Validates transfers using the transfer validator, ensuring the transfer is allowed._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The address to transfer the token to. |
| tokenId | uint256 | The ID of the token to transfer. |
| auth | address | The authorized caller of the function. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The address of the current token holder. |

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

