// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

/**
 * @title NftFactoryInfo
 * @notice A struct that contains info parameters for NFTFactory.
 * @dev This struct is used to store parameters in contract.
 */
struct NftFactoryInfo {
    /// @notice Platform address that is allowed to collect fees
    address platformAddress;
    /// @notice Address of the signer used for signature verification
    address signerAddress;
    /// @notice Address of the default payment currency
    address defaultPaymentCurrency;
    /// @notice The platform commission in BPs
    uint256 platformCommission;
}

/**
 * @title NftParameters
 * @notice A struct that contains all the parameters needed to create an NFT collection.
 * @dev This struct is used to pass parameters between contracts.
 */
struct NftParameters {
    /// @notice The address of the factory contract where the collection is created.
    address factory;
    /// @notice The detailed information about the NFT collection.
    InstanceInfo info;
    /// @notice The address of the creator of the NFT collection.
    address creator;
}

/**
 * @title InstanceInfo
 * @notice A struct that holds detailed information about an individual NFT collection.
 */
struct InstanceInfo {
    /// @notice The name of the NFT collection.
    string name;
    /// @notice The symbol of the NFT collection.
    string symbol;
    /// @notice The contract URI for the NFT collection, used for metadata.
    string contractURI;
    /// @notice The address of the ERC20 token used for payments, or ETH (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) for Ether.
    address payingToken;
    /// @notice The price to mint a token in the collection.
    uint256 mintPrice;
    /// @notice The price to mint a token for whitelisted users.
    uint256 whitelistMintPrice;
    /// @notice A flag indicating whether the tokens in the collection are transferable.
    bool transferable;
    /// @notice The maximum total supply of tokens in the collection.
    uint256 maxTotalSupply;
    /// @notice The royalty fraction for platform and creator royalties, expressed as a numerator.
    uint96 feeNumerator;
    /// @notice The address that will receive the royalties.
    address feeReceiver;
    /// @notice The expiration time for the collection.
    uint256 collectionExpire;
    /// @notice A signature provided by the backend for validation.
    bytes signature;
}

/**
 * @title NftParamsInfo
 * @notice A simplified struct that holds only the basic information of the NFT collection.
 */
struct NftParamsInfo {
    /// @notice The name of the NFT collection.
    string name;
    /// @notice The symbol of the NFT collection.
    string symbol;
    /// @notice The address of the creator of the NFT collection.
    address creator;
}
