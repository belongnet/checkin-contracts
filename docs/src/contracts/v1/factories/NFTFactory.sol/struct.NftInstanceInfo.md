# NftInstanceInfo
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/factories/NFTFactory.sol)

**Title:**
NftInstanceInfo

A simplified struct that holds only the basic information of the NFT collection, such as name, symbol, and creator.

This struct is used for lightweight storage of NFT collection metadata.


```solidity
struct NftInstanceInfo {
/// @notice The address of the creator of the NFT collection.
address creator;
/// @notice The address of the NFT contract instance.
address nftAddress;
/// @notice The address of the Royalties Receiver contract instance.
address royaltiesReceiver;
NftMetadata metadata;
}
```

