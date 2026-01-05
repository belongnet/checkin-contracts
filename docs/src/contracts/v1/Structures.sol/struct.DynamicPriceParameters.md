# DynamicPriceParameters
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/Structures.sol)

**Title:**
DynamicPriceParameters

A struct for holding parameters related to minting NFTs with a dynamic price.

This struct is used for dynamic price minting operations.


```solidity
struct DynamicPriceParameters {
/// @notice The ID of the token to be minted.
uint256 tokenId;
/// @notice The price for minting the specific token.
uint256 price;
/// @notice The URI of the metadata associated with the token being minted.
string tokenUri;
/// @notice The signature for verifying the minting request.
bytes signature;
}
```

