# StaticPriceParameters
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/Structures.sol)

**Title:**
StaticPriceParameters

A struct for holding parameters related to minting NFTs with a static price.

This struct is used for static price minting operations.


```solidity
struct StaticPriceParameters {
/// @notice The ID of the token to be minted.
uint256 tokenId;
/// @notice A flag indicating whether the receiver is whitelisted for special pricing.
bool whitelisted;
/// @notice The URI of the metadata associated with the token being minted.
string tokenUri;
/// @notice The signature for verifying the minting request.
bytes signature;
}
```

