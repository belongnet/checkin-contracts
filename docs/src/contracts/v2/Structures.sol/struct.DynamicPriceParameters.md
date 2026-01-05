# DynamicPriceParameters
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/Structures.sol)

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

