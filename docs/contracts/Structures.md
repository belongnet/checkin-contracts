# Solidity API

## NftFactoryInfo

A struct that contains parameters related to the NFT factory, such as platform and commission details.

_This struct is used to store key configuration information for the NFT factory._

```solidity
struct NftFactoryInfo {
  address platformAddress;
  address signerAddress;
  address defaultPaymentCurrency;
  uint256 platformCommission;
  uint256 maxArraySize;
}
```

## NftParameters

A struct that contains all necessary parameters for creating an NFT collection.

_This struct is used to pass parameters between contracts during the creation of a new NFT collection._

```solidity
struct NftParameters {
  address factory;
  struct InstanceInfo info;
  address creator;
}
```

## InstanceInfo

A struct that holds detailed information about an individual NFT collection, such as name, symbol, and pricing.

_This struct is used to store key metadata and configuration information for each NFT collection._

```solidity
struct InstanceInfo {
  string name;
  string symbol;
  string contractURI;
  address payingToken;
  uint256 mintPrice;
  uint256 whitelistMintPrice;
  bool transferable;
  uint256 maxTotalSupply;
  uint96 feeNumerator;
  address feeReceiver;
  uint256 collectionExpire;
  bytes signature;
}
```

## NftParamsInfo

A simplified struct that holds only the basic information of the NFT collection, such as name, symbol, and creator.

_This struct is used for lightweight storage of NFT collection metadata._

```solidity
struct NftParamsInfo {
  string name;
  string symbol;
  address creator;
}
```

## StaticPriceParams

A struct for holding parameters related to minting NFTs with a static price.

_This struct is used for static price minting operations._

```solidity
struct StaticPriceParams {
  address receiver;
  uint256 tokenId;
  bool whitelisted;
  string tokenUri;
  bytes signature;
}
```

## DynamicPriceParams

A struct for holding parameters related to minting NFTs with a dynamic price.

_This struct is used for dynamic price minting operations._

```solidity
struct DynamicPriceParams {
  address receiver;
  uint256 tokenId;
  uint256 price;
  string tokenUri;
  bytes signature;
}
```

