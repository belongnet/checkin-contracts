# NftInstanceInfo
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/platform/Factory.sol)

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

