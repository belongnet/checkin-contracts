# StaticPriceParameters
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/Structures.sol)

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

