# Solidity API

## ReferralCode

```solidity
struct ReferralCode {
  address creator;
  address[] referralUsers;
}
```

## ReferralPercentages

```solidity
struct ReferralPercentages {
  uint256 initial;
  uint256 second;
  uint256 third;
  uint256 byDefault;
}
```

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

## NftParameters

A struct that contains all necessary parameters for creating an NFT collection.

_This struct is used to pass parameters between contracts during the creation of a new NFT collection._

```solidity
struct NftParameters {
  address transferValidator;
  address factory;
  struct InstanceInfo info;
  address creator;
  bytes32 refferalCode;
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
  address feeReceiver;
  uint96 feeNumerator;
  bool transferable;
  uint256 maxTotalSupply;
  uint256 mintPrice;
  uint256 whitelistMintPrice;
  uint256 collectionExpire;
  bytes signature;
}
```

## NftInstanceInfo

A simplified struct that holds only the basic information of the NFT collection, such as name, symbol, and creator.

_This struct is used for lightweight storage of NFT collection metadata._

```solidity
struct NftInstanceInfo {
  string name;
  string symbol;
  address creator;
  address nftAddress;
}
```

## StaticPriceParameters

A struct for holding parameters related to minting NFTs with a static price.

_This struct is used for static price minting operations._

```solidity
struct StaticPriceParameters {
  address receiver;
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
  address receiver;
  uint256 tokenId;
  uint256 price;
  string tokenUri;
  bytes signature;
}
```

