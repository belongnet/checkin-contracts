// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

struct NftParameters {
    address storageContract; // Address of the storage contract
    InstanceInfo info;
    address creator; // Creator address
    address platform;
}

struct InstanceInfo {
    string name; //The name of the collection
    string symbol; // The symbol of the collection
    string contractURI; // Contract URI of a new collection
    address payingToken; // Address of ERC20 paying token or ETH address (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)
    uint256 mintPrice; // Mint price of a token from a new collection
    uint256 whitelistMintPrice; // Mint price of a token from a new collection for whitelisted users
    bool transferable; // Shows if tokens will be transferrable or not
    uint256 maxTotalSupply; // The max total supply of a new collection
    uint96 feeNumerator; // Royalty fraction for platform + Royalty fraction for creator
    address feeReceiver; // The royalties receiver address
    uint256 collectionExpire; // The period of time in which collection is expired (for the BE)
    bytes signature; // BE's signature
}
