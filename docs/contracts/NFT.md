# Solidity API

## IncorrectETHAmountSent

```solidity
error IncorrectETHAmountSent(uint256 ETHsent)
```

Error thrown when insufficient ETH is sent for a minting transaction.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ETHsent | uint256 | The amount of ETH sent. |

## PriceChanged

```solidity
error PriceChanged(uint256 currentPrice)
```

Error thrown when the mint price changes unexpectedly.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currentPrice | uint256 | The actual current mint price. |

## TokenChanged

```solidity
error TokenChanged(address currentPayingToken)
```

Error thrown when the paying token changes unexpectedly.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currentPayingToken | address | The actual current paying token. |

## WrongArraySize

```solidity
error WrongArraySize()
```

Error thrown when an array exceeds the maximum allowed size.

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

## TokenIdDoesNotExist

```solidity
error TokenIdDoesNotExist()
```

Error thrown when the token id is not exist.

## NFT

Implements the minting and transfer functionality for NFTs, including transfer validation and royalty management.

_This contract inherits from BaseERC721 and implements additional minting logic, including whitelist support and fee handling._

### Paid

```solidity
event Paid(address sender, address paymentCurrency, uint256 value)
```

Event emitted when a payment is made to the PricePoint.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | The address that made the payment. |
| paymentCurrency | address | The currency used for the payment. |
| value | uint256 | The amount of the payment. |

### NftParametersChanged

```solidity
event NftParametersChanged(address newToken, uint256 newPrice, uint256 newWLPrice, bool autoApproved)
```

Emitted when the paying token and prices are updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newToken | address | The address of the new paying token. |
| newPrice | uint256 | The new mint price. |
| newWLPrice | uint256 | The new whitelist mint price. |
| autoApproved | bool | The new value of the automatic approval flag. |

### ETH_ADDRESS

```solidity
address ETH_ADDRESS
```

The constant address representing ETH.

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

### parameters

```solidity
struct NftParameters parameters
```

The struct containing all NFT parameters for the collection.

### constructor

```solidity
constructor(struct NftParameters _params) public
```

Deploys the contract with the given collection parameters and transfer validator.

_Called by the factory when a new instance is deployed._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _params | struct NftParameters | Collection parameters containing information like name, symbol, fees, and more. |

### setNftParameters

```solidity
function setNftParameters(address _payingToken, uint128 _mintPrice, uint128 _whitelistMintPrice, bool autoApprove) external
```

Sets a new paying token and mint prices for the collection.

_Can only be called by the contract owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _payingToken | address | The new paying token address. |
| _mintPrice | uint128 | The new mint price. |
| _whitelistMintPrice | uint128 | The new whitelist mint price. |
| autoApprove | bool | If true, the transfer validator will be automatically approved for all token holders. |

### mintStaticPrice

```solidity
function mintStaticPrice(struct StaticPriceParameters[] paramsArray, address expectedPayingToken, uint256 expectedMintPrice) external payable
```

Mints new NFTs with static prices to specified addresses.

_Requires signatures from trusted addresses and validates against whitelist status._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| paramsArray | struct StaticPriceParameters[] | An array of parameters for each mint (receiver, tokenId, tokenUri, whitelisted). |
| expectedPayingToken | address | The expected token used for payments. |
| expectedMintPrice | uint256 | The expected price for the minting operation. |

### mintDynamicPrice

```solidity
function mintDynamicPrice(struct DynamicPriceParameters[] paramsArray, address expectedPayingToken) external payable
```

Mints new NFTs with dynamic prices to specified addresses.

_Requires signatures from trusted addresses and validates against whitelist status._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| paramsArray | struct DynamicPriceParameters[] | An array of parameters for each mint (receiver, tokenId, tokenUri, price). |
| expectedPayingToken | address | The expected token used for payments. |

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

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

_Returns true if this contract implements the interface defined by `interfaceId`.
See: https://eips.ethereum.org/EIPS/eip-165
This function call must use less than 30000 gas._

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

