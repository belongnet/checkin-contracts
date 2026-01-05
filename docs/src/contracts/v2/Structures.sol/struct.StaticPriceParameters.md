# StaticPriceParameters
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/Structures.sol)

**Title:**
StaticPriceParameters

Mint payload for static-priced mints validated by a platform signer.


```solidity
struct StaticPriceParameters {
/// @notice Whether receiver is eligible for whitelist pricing.
bool whitelisted;
/// @notice Token id to mint.
uint256 tokenId;
/// @notice Token metadata URI.
string tokenUri;
}
```

