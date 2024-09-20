# Solidity API

## NftParameters

A struct that contains all the parameters needed to create an NFT collection.

_This struct is used to pass parameters between contracts._

```solidity
struct NftParameters {
  address storageContract;
  struct InstanceInfo info;
  address creator;
  address platform;
}
```

## InstanceInfo

A struct that holds detailed information about an individual NFT collection.

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

## StorageInstanceInfo

A simplified struct that holds only the basic information of the NFT collection.

```solidity
struct StorageInstanceInfo {
  string name;
  string symbol;
  address creator;
}
```

