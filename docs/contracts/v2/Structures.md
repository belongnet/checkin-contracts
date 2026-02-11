# Solidity API

## NftMetadata

```solidity
struct NftMetadata {
  string name;
  string symbol;
}
```

## AccessTokenInfo

Initialization/configuration data for an AccessToken (ERC-721) collection.
@dev
- `paymentToken` can be an ERC-20 address or the NativeCurrency pseudo-address
  (`0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`).
- `feeNumerator` is used for ERC-2981 royalty configuration.

```solidity
struct AccessTokenInfo {
  address creator;
  address paymentToken;
  uint96 feeNumerator;
  bool transferable;
  uint256 maxTotalSupply;
  uint256 mintPrice;
  uint256 whitelistMintPrice;
  struct NftMetadata metadata;
  string contractURI;
}
```

## ERC1155Info

Initialization/configuration data for a CreditToken (ERC-1155) collection.

```solidity
struct ERC1155Info {
  address defaultAdmin;
  bool transferable;
  address manager;
  address minter;
  address burner;
  string name;
  string symbol;
  string uri;
}
```

## VestingWalletInfo

Parameters configuring a vesting wallet schedule and metadata.

```solidity
struct VestingWalletInfo {
  uint64 startTimestamp;
  uint64 cliffDurationSeconds;
  uint64 durationSeconds;
  address token;
  address beneficiary;
  uint256 totalAllocation;
  uint256 tgeAmount;
  uint256 linearAllocation;
  string description;
}
```

## StaticPriceParameters

Mint payload for static-priced mints validated by a platform signer.

```solidity
struct StaticPriceParameters {
  bool whitelisted;
  uint256 tokenId;
  string tokenUri;
}
```

## DynamicPriceParameters

Mint payload for dynamic-priced mints validated by a platform signer.

```solidity
struct DynamicPriceParameters {
  uint256 tokenId;
  uint256 price;
  string tokenUri;
}
```

## StakingTiers

Tier levels derived from staked LONG balance.

```solidity
enum StakingTiers {
  NoStakes,
  BronzeTier,
  SilverTier,
  GoldTier,
  PlatinumTier
}
```

## PaymentTypes

Venue-allowed payment currencies.

```solidity
enum PaymentTypes {
  NoType,
  USDtoken,
  LONG,
  Both
}
```

## BountyTypes

Venue-allowed promoter bounty schemes.

```solidity
enum BountyTypes {
  NoType,
  VisitBounty,
  SpendBounty,
  Both
}
```

## BountyAllocationTypes

```solidity
enum BountyAllocationTypes {
  NoType,
  ToPromoter,
  ToCustomer,
  Both
}
```

## LongPaymentTypes

Venue-allowed LONG payment options.

```solidity
enum LongPaymentTypes {
  NoType,
  AutoStake,
  AutoConvert
}
```

## VenueRules

Venue-level configuration for payment and bounty types.

```solidity
struct VenueRules {
  enum PaymentTypes paymentType;
  enum BountyTypes bountyType;
  enum BountyAllocationTypes bountyAllocationType;
  enum LongPaymentTypes longPaymentType;
}
```

## VenueInfo

Signed payload authorizing a venue deposit and metadata update.

```solidity
struct VenueInfo {
  struct VenueRules rules;
  address venue;
  uint256 amount;
  bytes32 affiliateReferralCode;
  string uri;
}
```

## CustomerInfo

Signed payload authorizing a customer payment to a venue (and optional promoter attribution).

```solidity
struct CustomerInfo {
  bool paymentInUSDtoken;
  struct Bounties toCustomer;
  struct Bounties toPromoter;
  address customer;
  address venueToPayFor;
  bytes32 promoterReferralCode;
  uint256 amount;
}
```

## Bounties

```solidity
struct Bounties {
  uint24 spendBountyPercentage;
  uint128 visitBountyAmount;
}
```

## PromoterInfo

Signed payload authorizing distribution of promoter payouts in USDtoken or LONG.

```solidity
struct PromoterInfo {
  bool paymentInUSDtoken;
  bytes32 promoterReferralCode;
  address venue;
  uint256 amountInUSD;
}
```
