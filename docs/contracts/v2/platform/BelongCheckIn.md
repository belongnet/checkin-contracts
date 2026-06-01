# Solidity API

## BelongCheckIn

Coordinates venue deposits, customer check-ins, and promoter settlements for the Belong program.
@dev
- Maintains venue and promoter balances as denominated ERC1155 credits (1 credit == 1 USD unit).
- Delegates token custody to {Escrow} while enforcing platform fees, referral incentives, and staking perks.
- Prices and swaps LONG through a dual DEX (Uniswap v4 / Pancake Infinity) router while deriving slippage bounds from a Chainlink price feed.
- Applies staking-tier-dependent deposit fees, customer discounts, and promoter fee splits.
- Streams platform revenue through a buyback-and-burn routine before forwarding the remainder to Factory.platformAddress.
- All externally triggered flows require EIP-712 signatures produced by the platform signer held in {Factory}.

### WrongReferralCode

```solidity
error WrongReferralCode(bytes32 referralCode)
```

Thrown when a provided referral code has no creator mapping in the Factory.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| referralCode | bytes32 | The invalid referral code. |

### CanNotClaim

```solidity
error CanNotClaim(address venue, address promoter)
```

Thrown when a promoter cannot claim payouts for a venue.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venue | address | The venue address in question. |
| promoter | address | The promoter attempting to claim. |

### NotAVenue

```solidity
error NotAVenue()
```

Thrown when the caller is not recognized as a venue (no venue credits).

### NotEnoughBalance

```solidity
error NotEnoughBalance(uint256 requiredAmount, uint256 availableBalance)
```

Thrown when an action requires more balance than available.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requiredAmount | uint256 | The amount required to proceed. |
| availableBalance | uint256 | The currently available balance. |

### NotEnoughPromoterBalance

```solidity
error NotEnoughPromoterBalance(uint256 requiredAmount)
```

Thrown when a promoter lacks sufficient credits to distribute a payout.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requiredAmount | uint256 | The amount requested for distribution. |

### WrongPaymentTypeProvided

```solidity
error WrongPaymentTypeProvided()
```

Thrown when a venue provides an invalid or disabled payment type.

### ProcessingFeeExceedsSubsidy

```solidity
error ProcessingFeeExceedsSubsidy()
```

Reverts when the processing fee percentage is configured above the subsidy percentage.

### TokensCanNotBeBurned

```solidity
error TokensCanNotBeBurned()
```

Thrown when LONG cannot be burned or transferred to the burn address.

### OnlyEOA

```solidity
error OnlyEOA()
```

Thrown when a contract (non-EOA) calls a restricted function.

### ZeroAmountProvided

```solidity
error ZeroAmountProvided()
```

Thrown when a zero amount is supplied where a positive value is required.

### FeesSet

```solidity
event FeesSet(struct BelongCheckIn.Fees fees)
```

Emitted when platform fee settings are updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fees | struct BelongCheckIn.Fees | The new fee configuration. |

### RewardsSet

```solidity
event RewardsSet(struct BelongCheckIn.RewardsInfo[5] rewards)
```

Emitted when staking reward tiers are updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| rewards | struct BelongCheckIn.RewardsInfo[5] | The new rewards configuration for all tiers. |

### VenueRulesSet

```solidity
event VenueRulesSet(address venue, struct VenueRules rules)
```

Emitted when a venue's rules are set or updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venue | address | The venue address. |
| rules | struct VenueRules | The rules applied to the venue. |

### ContractsSet

```solidity
event ContractsSet(struct BelongCheckIn.Contracts contracts)
```

Emitted when contract references are configured.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contracts | struct BelongCheckIn.Contracts | The set of external contract references. |

### VenuePaidDeposit

```solidity
event VenuePaidDeposit(address venue, bytes32 referralCode, struct VenueRules rules, uint256 amount)
```

Emitted when a venue deposits USDtoken to the program.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venue | address | The venue that made the deposit. |
| referralCode | bytes32 | The referral code used (if any). |
| rules | struct VenueRules | The rules applied to the venue at time of deposit. |
| amount | uint256 | The deposited USDtoken amount (in USDtoken native decimals). |

### CustomerPaid

```solidity
event CustomerPaid(address customer, address venueToPayFor, address promoter, uint256 amount, struct Bounties toCustomer, struct Bounties toPromoter)
```

Emitted when a customer pays a venue (in USDtoken or LONG).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| customer | address | The paying customer. |
| venueToPayFor | address | The venue receiving the payment. |
| promoter | address | The promoter credited, if any. |
| amount | uint256 | The payment amount (USDtoken native decimals for USDtoken; LONG wei for LONG). |
| toCustomer | struct Bounties |  |
| toPromoter | struct Bounties |  |

### PromoterPaymentsDistributed

```solidity
event PromoterPaymentsDistributed(address promoter, address venue, uint256 amountInUSD, bool paymentInUSDtoken)
```

Emitted when promoter payments are distributed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| promoter | address | The promoter receiving a payout. |
| venue | address | The venue to which the promoter's balance is linked. |
| amountInUSD | uint256 | The USD-denominated amount settled from promoter credits. |
| paymentInUSDtoken | bool | True if payout in USDtoken; false if swapped to LONG. |

### PromoterPaymentCancelled

```solidity
event PromoterPaymentCancelled(address venue, address promoter, uint256 amount)
```

Emitted when the owner cancels a promoter payment and restores venue credits.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venue | address | The venue whose credits are restored. |
| promoter | address | The promoter whose credits are burned. |
| amount | uint256 | The amount (USD-denominated credits) canceled and restored. |

### Swapped

```solidity
event Swapped(address recipient, uint256 amountIn, uint256 amountOut)
```

Emitted after a swap routed through the configured DEX.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address receiving LONG. |
| amountIn | uint256 | The USDtoken input amount. |
| amountOut | uint256 | The LONG output amount. |

### RevenueBuybackBurn

```solidity
event RevenueBuybackBurn(address token, uint256 gross, uint256 buyback, uint256 burnedLONG, uint256 fees)
```

Emitted when revenue is processed for buyback/burn.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | Revenue token address (USDtoken or LONG). |
| gross | uint256 | Total revenue processed. |
| buyback | uint256 | Amount allocated to buyback/burn (in revenue token units for USDtoken, LONG units for LONG). |
| burnedLONG | uint256 | Amount of LONG burned (or 0 if burn failed and was handled differently). |
| fees | uint256 | Amount forwarded to fee collector address. |

### BurnedLONGs

```solidity
event BurnedLONGs(address burnedTo, uint256 amountBurned)
```

Emitted when LONG is burned or sent to a burn address as a fallback.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| burnedTo | address | Address to which LONG was sent (zero address if direct burn, `DEAD` if transferred). |
| amountBurned | uint256 | Amount of LONG burned or transferred to the burn address. |

### VenueUsdWithdrawn

```solidity
event VenueUsdWithdrawn(address venue, uint256 amount)
```

Emitted when a venue withdraws unused USDtoken deposits from escrow.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venue | address | The withdrawing venue. |
| amount | uint256 | Amount of USDtoken transferred back to the venue. |

### BelongCheckInStorage

Top-level storage bundle for program configuration.

```solidity
struct BelongCheckInStorage {
  struct BelongCheckIn.Contracts contracts;
  struct BelongCheckIn.Fees fees;
}
```

### Contracts

Addresses of external contracts and oracles used by the program.

_`longPF` is a Chainlink aggregator proxy implementing `ILONGPriceFeed`._

```solidity
struct Contracts {
  contract Factory factory;
  contract Escrow escrow;
  contract Staking staking;
  contract CreditToken venueToken;
  contract CreditToken promoterToken;
  address longPF;
}
```

### Fees

Platform fee knobs and constants.

_Percentages are scaled by 1e4 (10000 == 100%).
- `referralCreditsAmount`: number of “free” credits before charging deposit fees again.
- `affiliatePercentage`: fee taken on venue deposits attributable to a referral.
- `longCustomerDiscountPercentage`: discount applied to LONG payments (customer side).
- `platformSubsidyPercentage`: LONG subsidy the platform adds for merchant when customer pays in LONG.
- `processingFeePercentage`: portion of LONG subsidy collected by the platform as processing fee._

```solidity
struct Fees {
  uint8 referralCreditsAmount;
  uint24 affiliatePercentage;
  uint24 longCustomerDiscountPercentage;
  uint24 platformSubsidyPercentage;
  uint24 processingFeePercentage;
  uint24 buybackBurnPercentage;
}
```

### GeneralVenueInfo

Venue-specific configuration and remaining “free” deposit credits.

```solidity
struct GeneralVenueInfo {
  struct VenueRules rules;
  uint16 remainingCredits;
}
```

### VenueDepositFeesInfo

Computed fee breakdown for venue deposits.

```solidity
struct VenueDepositFeesInfo {
  uint256 feeAmount;
  uint256 platformFee;
  uint256 convenienceFeeAmount;
  address affiliate;
  uint256 affiliateFee;
  bool useFreeCredit;
}
```

### VenueStakingRewardInfo

Per-tier venue-side fee settings.

_`depositFeePercentage` scaled by 1e4; `convenienceFeeAmount` is a flat USDtoken amount (native decimals)._

```solidity
struct VenueStakingRewardInfo {
  uint24 depositFeePercentage;
  uint128 convenienceFeeAmount;
}
```

### PromoterStakingRewardInfo

Per-tier promoter payout configuration.

_Percentages scaled by 1e4; separate values for USDtoken or LONG payouts._

```solidity
struct PromoterStakingRewardInfo {
  uint24 usdTokenPercentage;
  uint24 longPercentage;
}
```

### RewardsInfo

Bundle of venue and promoter tier settings for a given staking tier.

```solidity
struct RewardsInfo {
  struct BelongCheckIn.PromoterStakingRewardInfo promoterStakingInfo;
  struct BelongCheckIn.VenueStakingRewardInfo venueStakingInfo;
}
```

### belongCheckInStorage

```solidity
struct BelongCheckIn.BelongCheckInStorage belongCheckInStorage
```

Global program configuration.

### generalVenueInfo

```solidity
mapping(address => struct BelongCheckIn.GeneralVenueInfo) generalVenueInfo
```

Per-venue rule set and remaining free deposit credits.

_Keyed by venue address._

### stakingRewards

```solidity
mapping(enum StakingTiers => struct BelongCheckIn.RewardsInfo) stakingRewards
```

Staking-tier-indexed rewards configuration.

_Indexed by `StakingTiers` enum value [0..4]._

### onlyEOA

```solidity
modifier onlyEOA()
```

### constructor

```solidity
constructor() public
```

Disables initializers for the implementation contract.

### initialize

```solidity
function initialize(address _owner, struct DualDexSwapV4Lib.PaymentsInfo paymentsInfo_) external
```

Initializes core parameters, default tier tables, and transfers ownership.
@dev
- Derives a $5 convenience charge in native USDtoken decimals through `MetadataReaderLib.readDecimals`.
- Seeds default {Fees} and full 5-tier {RewardsInfo} tables used until `setParameters` is invoked.
- Callable exactly once; subsequent calls revert via {Initializable}.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | Address that will gain `onlyOwner` privileges. |
| paymentsInfo_ | struct DualDexSwapV4Lib.PaymentsInfo | Initial swap + asset configuration to persist. |

### setParameters

```solidity
function setParameters(struct DualDexSwapV4Lib.PaymentsInfo paymentsInfo_, struct BelongCheckIn.Fees _fees, struct BelongCheckIn.RewardsInfo[5] _stakingRewards) external
```

Owner-only convenience wrapper to replace swap configuration, fee knobs, and tier tables atomically.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| paymentsInfo_ | struct DualDexSwapV4Lib.PaymentsInfo | Fresh DEX + asset configuration to persist. |
| _fees | struct BelongCheckIn.Fees | Revised fee settings scaled by 1e4 (basis points domain). |
| _stakingRewards | struct BelongCheckIn.RewardsInfo[5] | Replacement 5-element rewards array (index matches {StakingTiers}). |

### setPaymentsInfo

```solidity
function setPaymentsInfo(struct DualDexSwapV4Lib.PaymentsInfo paymentsInfo_) external
```

Owner-only method to update swap routing and asset configuration.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| paymentsInfo_ | struct DualDexSwapV4Lib.PaymentsInfo | New DEX + asset configuration to persist. |

### setFees

```solidity
function setFees(struct BelongCheckIn.Fees _fees) external
```

Owner-only method to update platform fee configuration.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _fees | struct BelongCheckIn.Fees | New fee settings (basis points scaled by 1e4). |

### setRewards

```solidity
function setRewards(struct BelongCheckIn.RewardsInfo[5] _stakingRewards) external
```

Owner-only method to update staking rewards tiers.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stakingRewards | struct BelongCheckIn.RewardsInfo[5] | New rewards configuration for all tiers. |

### setContracts

```solidity
function setContracts(struct BelongCheckIn.Contracts _contracts) external
```

Owner-only method to update external contract references used by the module.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contracts | struct BelongCheckIn.Contracts | Set of contract dependencies (Factory, Escrow, Staking, venue/promoter tokens, price feed). |

### updateVenueRules

```solidity
function updateVenueRules(struct VenueRules rules) external
```

Allows a venue to change its rule configuration provided it still holds venue credits.

_Reverts with `NotAVenue()` when the caller has no outstanding credits (i.e. has not deposited yet)._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| rules | struct VenueRules | The updated `VenueRules` payload for the caller. |

### withdrawUnusedUSD

```solidity
function withdrawUnusedUSD(uint256 amount) external
```

Allows a venue to withdraw unused USDtoken deposits when no promoter payouts occur.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Amount of USDtoken to withdraw. |

### venueDeposit

```solidity
function venueDeposit(struct VenueInfo venueInfo, struct SignatureVerifier.SignatureProtection protection) external
```

Handles a venue USDtoken deposit, accounting for fee exemptions, affiliate rewards, and escrow funding.
@dev
- Signature-validated via platform signer from `Factory`.
- Tracks “free deposit” credits; the platform fee is skipped until the configured allowance is exhausted.
- Charges convenience plus affiliate fees in USDtoken, swaps them to LONG where applicable, and records the resulting LONG in escrow.
- Applies the buyback/burn split to the platform fee portion before forwarding the remainder to the fee collector.
- Forwards the full venue deposit to {Escrow} and mints venue credits to mirror the USD balance.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venueInfo | struct VenueInfo | Signed venue deposit parameters (venue, amount, referral code, venue rules, metadata URI). |
| protection | struct SignatureVerifier.SignatureProtection |  |

### venueDepositWithDeadline

```solidity
function venueDepositWithDeadline(struct VenueInfo venueInfo, struct SignatureVerifier.SignatureProtection protection, uint256 swapDeadline) external
```

### venueDepositFees

```solidity
function venueDepositFees(address venue, uint256 amount, bytes32 affiliateReferralCode) public view returns (uint256 feeAmount, uint256 platformFee, uint256 convenienceFeeAmount, address affiliate, uint256 affiliateFee)
```

### _venueDepositFees

```solidity
function _venueDepositFees(address venue, uint256 amount, bytes32 affiliateReferralCode) internal view returns (struct BelongCheckIn.VenueDepositFeesInfo feesInfo)
```

### _venueDeposit

```solidity
function _venueDeposit(struct VenueInfo venueInfo, struct SignatureVerifier.SignatureProtection protection, uint256 swapDeadline) internal
```

### payToVenue

```solidity
function payToVenue(struct CustomerInfo customerInfo, struct SignatureVerifier.SignatureProtection protection) external
```

Processes a customer payment to a venue, optionally attributing promoter rewards.
@dev
- Signature-validated via platform signer from `Factory`.
- Burns venue credits / mints promoter credits when a promoter participates in the visit.
- USDtoken payments move USDtoken directly from customer to venue.
- LONG payments pull the platform subsidy from escrow, collect the customer’s discounted LONG, then deliver/route LONG per venue rules.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| customerInfo | struct CustomerInfo | Signed customer payment parameters (customer, venue, promoter, amount, payment flags, bounty data). |
| protection | struct SignatureVerifier.SignatureProtection |  |

### payToVenueWithDeadline

```solidity
function payToVenueWithDeadline(struct CustomerInfo customerInfo, struct SignatureVerifier.SignatureProtection protection, uint256 swapDeadline) external
```

### _payToVenue

```solidity
function _payToVenue(struct CustomerInfo customerInfo, struct SignatureVerifier.SignatureProtection protection, uint256 swapDeadline) internal
```

### distributePromoterPayments

```solidity
function distributePromoterPayments(struct PromoterInfo promoterInfo, struct SignatureVerifier.SignatureProtection protection) external
```

Settles promoter credits into an on-chain payout in either USDtoken or LONG.
@dev
- Signature-validated via platform signer from `Factory`.
- Applies tiered platform fees based on the promoter’s staked LONG in {Staking}.
- USDtoken payouts draw both fee and promoter portions from escrow; fees are streamed through `_handleRevenue`.
- LONG payouts draw USDtoken from escrow, swap the full amount using the V3 router, and subject the swapped fee portion to the buyback routine.
- Always burns promoter ERC1155 credits by the settled USD amount to prevent re-claims.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| promoterInfo | struct PromoterInfo | Signed settlement parameters (promoter, venue, USD amount, payout currency flag). |
| protection | struct SignatureVerifier.SignatureProtection |  |

### distributePromoterPaymentsWithDeadline

```solidity
function distributePromoterPaymentsWithDeadline(struct PromoterInfo promoterInfo, struct SignatureVerifier.SignatureProtection protection, uint256 swapDeadline) external
```

### _distributePromoterPayments

```solidity
function _distributePromoterPayments(struct PromoterInfo promoterInfo, struct SignatureVerifier.SignatureProtection protection, uint256 swapDeadline) internal
```

### emergencyCancelPayment

```solidity
function emergencyCancelPayment(address venue, address promoter) external
```

Owner-only escape hatch that restores a venue’s credits by cancelling a promoter’s balance.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venue | address | Venue that will regain the promoter’s USD credits. |
| promoter | address | Promoter whose outstanding credits are burned. |

### contracts

```solidity
function contracts() external view returns (struct BelongCheckIn.Contracts contracts_)
```

Returns current contract dependencies.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| contracts_ | struct BelongCheckIn.Contracts | The persisted {Contracts} struct. |

### fees

```solidity
function fees() external view returns (struct BelongCheckIn.Fees fees_)
```

Returns platform fee configuration.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| fees_ | struct BelongCheckIn.Fees | The persisted {Fees} struct. |

### _swapUSDtokenToLONG

```solidity
function _swapUSDtokenToLONG(address recipient, uint256 amount, uint256 deadline) internal returns (uint256 swapped)
```

Swaps an exact USDtoken amount to LONG, then delivers proceeds to `recipient`.

_Emits `Swapped` to maintain downstream observability._

### _swapLONGtoUSDtoken

```solidity
function _swapLONGtoUSDtoken(address recipient, uint256 amount, uint256 deadline) internal returns (uint256 swapped)
```

Swaps an exact LONG amount to USDtoken, then delivers proceeds to `recipient`.

_Emits `Swapped` to maintain downstream observability._

### _quoteUSDtokenToLONG

```solidity
function _quoteUSDtokenToLONG(uint256 amount) internal view returns (uint256)
```

### _quoteLONGtoUSDtoken

```solidity
function _quoteLONGtoUSDtoken(uint256 amount) internal view returns (uint256)
```

### _handleRevenue

```solidity
function _handleRevenue(address token, uint256 amount, uint256 swapDeadline) internal
```

_Splits platform revenue: swaps a configurable portion for LONG and burns it, then forwards the remainder to the fee collector._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | Revenue token address (USDtoken/LONG supported; unknown tokens are forwarded intact). |
| amount | uint256 | Revenue amount received by this contract. |
| swapDeadline | uint256 |  |

### _calculateRewards

```solidity
function _calculateRewards(address to, address venue, uint256 venueId, bool paymentInUSDtoken, struct Bounties bounties, uint256 amount) internal
```

### _getUserStakingTier

```solidity
function _getUserStakingTier(address user) internal view returns (enum StakingTiers)
```

