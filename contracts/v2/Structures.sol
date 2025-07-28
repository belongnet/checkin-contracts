// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

struct Metadata {
    /// @notice The name of the NFT collection.
    string name;
    /// @notice The symbol representing the NFT collection.
    string symbol;
}

/**
 * @title InstanceInfo
 * @notice A struct that holds detailed information about an individual NFT collection, such as name, symbol, and pricing.
 * @dev This struct is used to store key metadata and configuration information for each NFT collection.
 */
struct AccessTokenInfo {
    /// @notice The address of the ERC20 token used for payments, or ETH (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) for Ether.
    address paymentToken;
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
    Metadata metadata;
    /// @notice The contract URI for the NFT collection, used for metadata.
    string contractURI;
    /// @notice A signature provided by the backend to validate the creation of the collection.
    bytes signature;
}

struct ERC1155Info {
    string name;
    string symbol;
    address defaultAdmin;
    address manager;
    address minter;
    address burner;
    string uri;
    bool transferable;
}

/**
 * @title StaticPriceParameters
 * @notice A struct for holding parameters related to minting NFTs with a static price.
 * @dev This struct is used for static price minting operations.
 */
struct StaticPriceParameters {
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
    /// @notice The ID of the token to be minted.
    uint256 tokenId;
    /// @notice The price for minting the specific token.
    uint256 price;
    /// @notice The URI of the metadata associated with the token being minted.
    string tokenUri;
    /// @notice The signature for verifying the minting request.
    bytes signature;
}

enum StakingTiers {
    NoStakes,
    BronzeTier,
    SilverTier,
    GoldTier,
    PlatinumTier
}

enum TimelockTiers {
    NoTimelock,
    Timelock1,
    Timelock2,
    Timelock3,
    Timelock4
}

enum PaymentTypes {
    NoType,
    USDC,
    LONG,
    Both
}

enum BountyTypes {
    NoType,
    VisitBounty,
    SpendBounty,
    Both
}

struct VenueRules {
    PaymentTypes paymentType;
    BountyTypes bountyType;
}

struct VenueInfo {
    VenueRules rules;
    address venue;
    uint256 amount;
    bytes32 referralCode;
    string uri;
    bytes signature;
}

struct CustomerInfo {
    bool paymentInUsdc;
    uint24 visitBountyAmount;
    uint24 spendBonusPercentage;
    //
    address customer;
    address venueToPayFor;
    address promoter;
    uint256 amount;
    bytes signature;
}
