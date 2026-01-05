# AccessTokenInfo
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/Structures.sol)

**Title:**
AccessTokenInfo

Initialization/configuration data for an AccessToken (ERC-721) collection.


- `paymentToken` can be a token address or the NativeCurrency pseudo-address
(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE).
- `feeNumerator` is used for ERC-2981 royalty configuration.
- `signature` is validated off-chain by a platform signer.


```solidity
struct AccessTokenInfo {
address creator;
/// @notice ERC-20 used for payments, or NativeCurrency pseudo-address for native NativeCurrency.
address paymentToken;
/// @notice ERC-2981 royalty numerator (denominator defined by receiver).
uint96 feeNumerator;
/// @notice Whether transfers between users are allowed.
bool transferable;
/// @notice Collection-wide supply cap.
uint256 maxTotalSupply;
/// @notice Public mint price.
uint256 mintPrice;
/// @notice Whitelist mint price.
uint256 whitelistMintPrice;
/// @notice Collection name and symbol stored as NftMetadata struct.
NftMetadata metadata;
/// @notice Contract-level metadata URI.
string contractURI;
}
```

