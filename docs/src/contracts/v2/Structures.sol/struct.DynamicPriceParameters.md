# DynamicPriceParameters
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/Structures.sol)

**Title:**
DynamicPriceParameters

Mint payload for dynamic-priced mints validated by a platform signer.


```solidity
struct DynamicPriceParameters {
/// @notice Token id to mint.
uint256 tokenId;
/// @notice Explicit price for this mint.
uint256 price;
/// @notice Token metadata URI.
string tokenUri;
}
```

