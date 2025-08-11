# Solidity API

## AccessTokenInfo

Initialization/configuration data for an AccessToken (ERC-721) collection.
@dev
- `paymentToken` can be a token address or the ETH pseudo-address
  (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE).
- `feeNumerator` is used for ERC-2981 royalty configuration.
- `signature` is validated off-chain by a platform signer.

```solidity
struct AccessTokenInfo {
  address paymentToken;
  uint96 feeNumerator;
  bool transferable;
  uint256 maxTotalSupply;
  uint256 mintPrice;
  uint256 whitelistMintPrice;
  uint256 collectionExpire;
  string name;
  string symbol;
  string contractURI;
  bytes signature;
}
```

## ERC1155Info

Initialization/configuration data for a CreditToken (ERC-1155) collection.

```solidity
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
```

## StaticPriceParameters

Mint payload for static-priced mints validated by a platform signer.

```solidity
struct StaticPriceParameters {
  uint256 tokenId;
  bool whitelisted;
  string tokenUri;
  bytes signature;
}
```

## DynamicPriceParameters

Mint payload for dynamic-priced mints validated by a platform signer.

```solidity
struct DynamicPriceParameters {
  uint256 tokenId;
  uint256 price;
  string tokenUri;
  bytes signature;
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
  USDC,
  LONG,
  Both
}
```

## BountyTypes

Allowed promoter bounty schemes.

```solidity
enum BountyTypes {
  NoType,
  VisitBounty,
  SpendBounty,
  Both
}
```

## VenueRules

Venue-level configuration for payment and bounty types.

```solidity
struct VenueRules {
  enum PaymentTypes paymentType;
  enum BountyTypes bountyType;
}
```

## VenueInfo

Signed payload authorizing a venue deposit and metadata update.

```solidity
struct VenueInfo {
  struct VenueRules rules;
  address venue;
  uint256 amount;
  bytes32 referralCode;
  string uri;
  bytes signature;
}
```

## CustomerInfo

Signed payload authorizing a customer payment to a venue (and optional promoter attribution).

```solidity
struct CustomerInfo {
  bool paymentInUSDC;
  uint24 visitBountyAmount;
  uint24 spendBountyPercentage;
  address customer;
  address venueToPayFor;
  address promoter;
  uint256 amount;
  bytes signature;
}
```

## PromoterInfo

Signed payload authorizing distribution of promoter payouts in USDC or LONG.

```solidity
struct PromoterInfo {
  bool paymentInUSDC;
  address promoter;
  address venue;
  uint256 amountInUSD;
  bytes signature;
}
```

