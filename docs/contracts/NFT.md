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
| currentPayingToken | address | The actual current paying token. |

## WrongArraySize

```solidity
error WrongArraySize()
```

Error thrown when an array exceeds the maximum allowed size.

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

### ETH_ADDRESS

```solidity
address ETH_ADDRESS
```

The constant address representing ETH.

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

### mintStaticPriceBatch

```solidity
function mintStaticPriceBatch(struct StaticPriceParameters[] paramsArray, address expectedPayingToken, uint256 expectedMintPrice) external payable
```

Batch mints new NFTs with static prices to specified addresses.

_Requires signatures from trusted addresses and validates against whitelist status._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| paramsArray | struct StaticPriceParameters[] | An array of parameters for each mint (receiver, tokenId, tokenUri, whitelisted). |
| expectedPayingToken | address | The expected token used for payments. |
| expectedMintPrice | uint256 | The expected price for the minting operation. |

### mintDynamicPriceBatch

```solidity
function mintDynamicPriceBatch(struct DynamicPriceParameters[] paramsArray, address expectedPayingToken) external payable
```

Batch mints new NFTs with dynamic prices to specified addresses.

_Requires signatures from trusted addresses and validates against whitelist status._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| paramsArray | struct DynamicPriceParameters[] | An array of parameters for each mint (receiver, tokenId, tokenUri, price). |
| expectedPayingToken | address | The expected token used for payments. |

### mintStaticPrice

```solidity
function mintStaticPrice(struct StaticPriceParameters params, address expectedPayingToken, uint256 expectedMintPrice) external payable
```

Mints a new NFT with a static price to a specified address.

_Requires a signature from a trusted address and validates against whitelist status._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct StaticPriceParameters | Minting parameters including receiver, tokenId, tokenUri, and whitelist status. |
| expectedPayingToken | address | The expected token used for payments. |
| expectedMintPrice | uint256 | The expected price for the minting operation. |

### mintDynamicPrice

```solidity
function mintDynamicPrice(struct DynamicPriceParameters params, address expectedPayingToken) external payable
```

Mints a new NFT with a dynamic price to a specified address.

_Requires a signature from a trusted address and validates against whitelist status._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct DynamicPriceParameters | Minting parameters including receiver, tokenId, tokenUri, and price. |
| expectedPayingToken | address | The expected token used for payments. |

