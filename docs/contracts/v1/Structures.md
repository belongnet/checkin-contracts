# Solidity API

## InvalidSignature

```solidity
error InvalidSignature()
```

Error thrown when the signature provided is invalid.

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

## StaticPriceParameters

A struct for holding parameters related to minting NFTs with a static price.

_This struct is used for static price minting operations._

```solidity
struct StaticPriceParameters {
  uint256 tokenId;
  bool whitelisted;
  string tokenUri;
  bytes signature;
}
```

## DynamicPriceParameters

A struct for holding parameters related to minting NFTs with a dynamic price.

_This struct is used for dynamic price minting operations._

```solidity
struct DynamicPriceParameters {
  uint256 tokenId;
  uint256 price;
  string tokenUri;
  bytes signature;
}
```

