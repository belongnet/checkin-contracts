# InstanceInfo
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/factories/NFTFactory.sol)

**Title:**
InstanceInfo

A struct that holds detailed information about an individual NFT collection, such as name, symbol, and pricing.

This struct is used to store key metadata and configuration information for each NFT collection.


```solidity
struct InstanceInfo {
/// @notice The address of the ERC20 token used for payments, or ETH (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) for Ether.
address payingToken;
/// @notice The royalty fraction for platform and creator royalties, expressed as a numerator.
uint96 feeNumerator;
/// @notice A boolean flag indicating whether the tokens in the collection are transferable.
bool transferable;
/// @notice The maximum total supply of tokens in the collection.
uint256 maxTotalSupply;
/// @notice The price to mint a token in the collection.
uint256 mintPrice;
/// @notice The price to mint a token for whitelisted users in the collection.
uint256 whitelistMintPrice;
/// @notice The expiration time (as a timestamp) for the collection.
uint256 collectionExpire;
NftMetadata metadata;
/// @notice The contract URI for the NFT collection, used for metadata.
string contractURI;
/// @notice A signature provided by the backend to validate the creation of the collection.
bytes signature;
}
```

