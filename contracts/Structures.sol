// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/// @notice Struct for managing a referral code and its users.
struct ReferralCode {
    /// @notice The creator of the referral code.
    address creator;
    /// @notice The list of users who have used the referral code.
    address[] referralUsers;
}

/// @notice Struct for managing referral percentages for different usages.
struct ReferralPercentages {
    /// @notice The percentage applied the first time the referral code is used.
    uint16 initialPercentage;
    /// @notice The percentage applied the second time the referral code is used.
    uint16 secondTimePercentage;
    /// @notice The percentage applied the third time the referral code is used.
    uint16 thirdTimePercentage;
    /// @notice The default percentage applied after the third usage of the referral code.
    uint16 percentageByDefault;
}

/**
 * @title NftFactoryParameters
 * @notice A struct that contains parameters related to the NFT factory, such as platform and commission details.
 * @dev This struct is used to store key configuration information for the NFT factory.
 */
struct NftFactoryParameters {
    /// @notice The platform address that is allowed to collect fees.
    address platformAddress;
    /// @notice The address of the signer used for signature verification.
    address signerAddress;
    /// @notice The address of the default payment currency.
    address defaultPaymentCurrency;
    /// @notice The platform commission in basis points (BPs).
    uint256 platformCommission;
    /// @notice The maximum size of an array allowed in batch operations.
    uint256 maxArraySize;
    /// @notice The address of the contract used to validate token transfers.
    address transferValidator;
}

/**
 * @title NftParameters
 * @notice A struct that contains all necessary parameters for creating an NFT collection.
 * @dev This struct is used to pass parameters between contracts during the creation of a new NFT collection.
 */
struct NftParameters {
    /// @notice The address of the contract used to validate token transfers.
    address transferValidator;
    /// @notice The address of the factory contract where the NFT collection is created.
    address factory;
    /// @notice The detailed information about the NFT collection, including its properties and configuration.
    InstanceInfo info;
    /// @notice The address of the creator of the NFT collection.
    address creator;
    /// @notice The referral code associated with the NFT collection.
    bytes32 referralCode;
}

/**
 * @title InstanceInfo
 * @notice A struct that holds detailed information about an individual NFT collection, such as name, symbol, and pricing.
 * @dev This struct is used to store key metadata and configuration information for each NFT collection.
 */
struct InstanceInfo {
    /// @notice The name of the NFT collection.
    string name;
    /// @notice The symbol representing the NFT collection.
    string symbol;
    /// @notice The contract URI for the NFT collection, used for metadata.
    string contractURI;
    /// @notice The address of the ERC20 token used for payments, or ETH (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) for Ether.
    address payingToken;
    /// @notice The address that will receive the royalties from secondary sales.
    address feeReceiver;
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
    /// @notice A signature provided by the backend to validate the creation of the collection.
    bytes signature;
}

/**
 * @title NftInstanceInfo
 * @notice A simplified struct that holds only the basic information of the NFT collection, such as name, symbol, and creator.
 * @dev This struct is used for lightweight storage of NFT collection metadata.
 */
struct NftInstanceInfo {
    /// @notice The name of the NFT collection.
    string name;
    /// @notice The symbol representing the NFT collection.
    string symbol;
    /// @notice The address of the creator of the NFT collection.
    address creator;
    /// @notice The address of the NFT contract instance.
    address nftAddress;
}

/**
 * @title StaticPriceParameters
 * @notice A struct for holding parameters related to minting NFTs with a static price.
 * @dev This struct is used for static price minting operations.
 */
struct StaticPriceParameters {
    /// @notice The address that will receive the newly minted NFT.
    address receiver;
    /// @notice The ID of the token to be minted.
    uint256 tokenId;
    /// @notice A flag indicating whether the receiver is whitelisted for special pricing.
    bool whitelisted;
    /// @notice The URI of the metadata associated with the token being minted.
    string tokenUri;
    /// @notice The signature for verifying the minting request.
    bytes signature;
}

/**
 * @title DynamicPriceParameters
 * @notice A struct for holding parameters related to minting NFTs with a dynamic price.
 * @dev This struct is used for dynamic price minting operations.
 */
struct DynamicPriceParameters {
    /// @notice The address that will receive the newly minted NFT.
    address receiver;
    /// @notice The ID of the token to be minted.
    uint256 tokenId;
    /// @notice The price for minting the specific token.
    uint256 price;
    /// @notice The URI of the metadata associated with the token being minted.
    string tokenUri;
    /// @notice The signature for verifying the minting request.
    bytes signature;
}

/// @notice Struct for tracking total released amounts and account-specific released amounts.
struct Releases {
    /// @notice The total amount of funds released from the contract.
    uint256 totalReleased;
    /// @notice A mapping to track the released amount per payee account.
    mapping(address => uint256) released;
}

/// @notice Struct for managing total shares and individual account shares.
struct SharesAdded {
    /// @notice The total number of shares allocated across all payees.
    uint256 totalShares;
    /// @notice A mapping to track the shares allocated to each payee.
    mapping(address => uint256) shares;
}
