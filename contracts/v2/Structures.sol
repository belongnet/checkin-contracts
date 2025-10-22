// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

struct NftMetadata {
    /// @notice The name of the NFT collection.
    string name;
    /// @notice The symbol representing the NFT collection.
    string symbol;
}

/// @title AccessTokenInfo
/// @notice Initialization/configuration data for an AccessToken (ERC-721) collection.
/// @dev
/// - `paymentToken` can be a token address or the NativeCurrency pseudo-address
///   (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE).
/// - `feeNumerator` is used for ERC-2981 royalty configuration.
/// - `signature` is validated off-chain by a platform signer.
struct AccessTokenInfo {
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
    /// @notice Optional collection expiration timestamp (seconds since epoch).
    uint256 collectionExpire;
    /// @notice Collection name and symbol stored as NftMetadata struct.
    NftMetadata metadata;
    /// @notice Contract-level metadata URI.
    string contractURI;
    /// @notice Backend signature authorizing creation with the provided fields.
    bytes signature;
}

/// @title ERC1155Info
/// @notice Initialization/configuration data for a CreditToken (ERC-1155) collection.
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

/// @title VestingWalletInfo
/// @notice Parameters configuring a vesting wallet schedule and metadata.
struct VestingWalletInfo {
    /// @notice Vesting start timestamp (TGE) in seconds since epoch.
    uint64 startTimestamp;
    /// @notice Cliff duration in seconds added to `startTimestamp` for the linear section to begin.
    uint64 cliffDurationSeconds;
    /// @notice Linear vesting duration in seconds counted from `cliff`.
    uint64 durationSeconds;
    /// @notice ERC-20 token being vested.
    address token;
    /// @notice Recipient of vested token releases.
    address beneficiary;
    /// @notice Total tokens allocated to this vesting schedule (must equal TGE + linear + tranches).
    uint256 totalAllocation;
    /// @notice One-off amount vested immediately at `startTimestamp`.
    uint256 tgeAmount;
    /// @notice Amount linearly vested over `durationSeconds` starting at `cliff`.
    uint256 linearAllocation;
    /// @notice Human-readable description of the vesting schedule.
    string description;
}

/// @title StaticPriceParameters
/// @notice Mint payload for static-priced mints validated by a platform signer.
struct StaticPriceParameters {
    /// @notice Token id to mint.
    uint256 tokenId;
    /// @notice Whether receiver is eligible for whitelist pricing.
    bool whitelisted;
    /// @notice Token metadata URI.
    string tokenUri;
    /// @notice Backend signature validating the payload.
    bytes signature;
}

/// @title DynamicPriceParameters
/// @notice Mint payload for dynamic-priced mints validated by a platform signer.
struct DynamicPriceParameters {
    /// @notice Token id to mint.
    uint256 tokenId;
    /// @notice Explicit price for this mint.
    uint256 price;
    /// @notice Token metadata URI.
    string tokenUri;
    /// @notice Backend signature validating the payload.
    bytes signature;
}

/// @title StakingTiers
/// @notice Tier levels derived from staked LONG balance.
enum StakingTiers {
    NoStakes,
    BronzeTier,
    SilverTier,
    GoldTier,
    PlatinumTier
}

/// @title PaymentTypes
/// @notice Venue-allowed payment currencies.
enum PaymentTypes {
    NoType,
    USDC,
    LONG,
    Both
}

/// @title BountyTypes
/// @notice Venue-allowed promoter bounty schemes.
enum BountyTypes {
    NoType,
    VisitBounty,
    SpendBounty,
    Both
}

/// @title BountyAllocationTypes
enum BountyAllocationTypes {
    NoType,
    ToPromoter,
    ToCustomer,
    Both
}

/// @title LongPaymentTypes
/// @notice Venue-allowed Long payment options.
enum LongPaymentTypes {
    NoType,
    AutoStake,
    AutoConvert
}

/// @title VenueRules
/// @notice Venue-level configuration for payment and bounty types.
struct VenueRules {
    PaymentTypes paymentType;
    BountyTypes bountyType;
    BountyAllocationTypes bountyAllocationType;
    LongPaymentTypes longPaymentType;
}

/// @title VenueInfo
/// @notice Signed payload authorizing a venue deposit and metadata update.
struct VenueInfo {
    VenueRules rules;
    address venue;
    uint256 amount;
    bytes32 affiliateReferralCode;
    string uri;
    bytes signature;
}

/// @title CustomerInfo
/// @notice Signed payload authorizing a customer payment to a venue (and optional promoter attribution).
struct CustomerInfo {
    // Backend configurable
    bool paymentInUSDC;
    Bounties toCustomer;
    Bounties toPromoter;
    // Actors
    address customer;
    address venueToPayFor;
    bytes32 promoterReferralCode;
    // Amounts
    uint256 amount;
    bytes signature;
}

struct Bounties {
    uint24 spendBountyPercentage;
    uint128 visitBountyAmount;
}

/// @title PromoterInfo
/// @notice Signed payload authorizing distribution of promoter payouts in USDC or LONG.
struct PromoterInfo {
    bool paymentInUSDC;
    bytes32 promoterReferralCode;
    address venue;
    uint256 amountInUSD;
    bytes signature;
}
