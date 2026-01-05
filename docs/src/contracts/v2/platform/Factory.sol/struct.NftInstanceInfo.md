# NftInstanceInfo
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/platform/Factory.sol)

Summary information about a deployed AccessToken collection.


```solidity
struct NftInstanceInfo {
/// @notice Creator address for the collection.
address creator;
/// @notice Deployed AccessToken proxy address.
address nftAddress;
/// @notice Deployed RoyaltiesReceiver address (or zero if feeNumerator == 0).
address royaltiesReceiver;
/// @notice Collection name and symbol stored as NftMetadata struct.
NftMetadata metadata;
}
```

