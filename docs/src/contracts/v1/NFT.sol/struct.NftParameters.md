# NftParameters
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/NFT.sol)

**Title:**
NftParameters

A struct that contains all necessary parameters for creating an NFT collection.

This struct is used to pass parameters between contracts during the creation of a new NFT collection.


```solidity
struct NftParameters {
/// @notice The address of the contract used to validate token transfers.
address transferValidator;
/// @notice The address of the factory contract where the NFT collection is created.
address factory;
/// @notice The address of the creator of the NFT collection.
address creator;
/// @notice The address that will receive the royalties from secondary sales.
address feeReceiver;
/// @notice The referral code associated with the NFT collection.
bytes32 referralCode;
/// @notice The detailed information about the NFT collection, including its properties and configuration.
InstanceInfo info;
}
```

