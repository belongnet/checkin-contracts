// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/// @notice Error thrown when the signature provided is invalid.
error InvalidSignature();

/// @notice Struct for managing a referral code and its users.
struct ReferralCode {
    /// @notice The creator of the referral code.
    address creator;
    /// @notice The list of users who have used the referral code.
    address[] referralUsers;
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
    /// @notice The address of the creator of the NFT collection.
    address creator;
    /// @notice The address that will receive the royalties from secondary sales.
    address feeReceiver;
    /// @notice The referral code associated with the NFT collection.
    bytes32 referralCode;
    /// @notice The detailed information about the NFT collection, including its properties and configuration.
    InstanceInfo info;
}

/**
 * @title InstanceInfo
 * @notice A struct that holds detailed information about an individual NFT collection, such as name, symbol, and pricing.
 * @dev This struct is used to store key metadata and configuration information for each NFT collection.
 */
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

struct NftMetadata {
    /// @notice The name of the NFT collection.
    string name;
    /// @notice The symbol representing the NFT collection.
    string symbol;
}

/**
 * @title NftInstanceInfo
 * @notice A simplified struct that holds only the basic information of the NFT collection, such as name, symbol, and creator.
 * @dev This struct is used for lightweight storage of NFT collection metadata.
 */
struct NftInstanceInfo {
    /// @notice The address of the creator of the NFT collection.
    address creator;
    /// @notice The address of the NFT contract instance.
    address nftAddress;
    /// @notice The address of the Royalties Receiver contract instance.
    address royaltiesReceiver;
    NftMetadata metadata;
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

/// @notice Struct for tracking total released amounts and account-specific released amounts.
struct Releases {
    /// @notice The total amount of funds released from the contract.
    uint256 totalReleased;
    /// @notice A mapping to track the released amount per payee account.
    mapping(address => uint256) released;
}

struct RoyaltiesParameters {
    uint16 amountToCreator;
    uint16 amountToPlatform;
}

struct Implementations {
    address accessToken;
    address promoterToken;
    address royaltiesReceiver;
}

struct VenueInfo {
    address venue;
    uint256 venueId;
    uint256 amount;
    string uri;
    bytes signature;
}

struct SwapInfo {
    uint24 poolFees;
    address uniswapV3Router;
    address uniswapV3Quoter;
    address weth;
    address tokenFrom; // eg USDC
    address tokenTo; // eg LONG
}
