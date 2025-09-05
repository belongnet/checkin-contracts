# Solidity API

## BelongCheckIn

Orchestrates venue deposits, customer payments, and promoter payouts for a
        referral-based commerce program with dual-token accounting (USDC/LONG).
@dev
- Uses ERC1155 credits (`CreditToken`) to track venue balances and promoter entitlements in USD units.
- Delegates custody and distribution of USDC/LONG to `Escrow`.
- Prices LONG via a Chainlink feed (`ILONGPriceFeed`) and swaps USDC→LONG on Uniswap V3.
- Applies tiered fees/discounts depending on staked balance in `Staking`.
- Signature-gated actions are authorized through a platform signer configured in `Factory`.

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

### WrongPaymentTypeProvided

```solidity
error WrongPaymentTypeProvided()
```

Thrown when a venue provides an invalid or disabled payment type.

### BPSTooHigh

```solidity
error BPSTooHigh()
```

Reverts when a provided bps value exceeds the configured scaling domain.

### NoValidSwapPath

```solidity
error NoValidSwapPath()
```

Thrown when no valid swap path is found for a USDC→LONG OR LONG→USDC swap.

### ParametersSet

```solidity
event ParametersSet(struct BelongCheckIn.PaymentsInfo paymentsInfo, struct BelongCheckIn.Fees fees, struct BelongCheckIn.RewardsInfo[5] rewards)
```

Emitted when global parameters are updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| paymentsInfo | struct BelongCheckIn.PaymentsInfo | Uniswap/asset addresses and pool fee configuration. |
| fees | struct BelongCheckIn.Fees | Platform-level fee settings. |
| rewards | struct BelongCheckIn.RewardsInfo[5] | Array of tiered staking rewards (index by `StakingTiers`). |

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

Emitted when a venue deposits USDC to the program.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venue | address | The venue that made the deposit. |
| referralCode | bytes32 | The referral code used (if any). |
| rules | struct VenueRules | The rules applied to the venue at time of deposit. |
| amount | uint256 | The deposited USDC amount (in USDC native decimals). |

### CustomerPaid

```solidity
event CustomerPaid(address customer, address venueToPayFor, address promoter, uint256 amount, uint128 visitBountyAmount, uint24 spendBountyPercentage)
```

Emitted when a customer pays a venue (in USDC or LONG).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| customer | address | The paying customer. |
| venueToPayFor | address | The venue receiving the payment. |
| promoter | address | The promoter credited, if any. |
| amount | uint256 | The payment amount (USDC native decimals for USDC; LONG wei for LONG). |
| visitBountyAmount | uint128 | Flat bounty component (USDC native decimals) if paying in USDC; standardized in logic for LONG. |
| spendBountyPercentage | uint24 | Percentage bounty on spend (scaled by 1e4 where 10000 == 100%). |

### PromoterPaymentsDistributed

```solidity
event PromoterPaymentsDistributed(address promoter, address venue, uint256 amountInUSD, bool paymentInUSDC)
```

Emitted when promoter payments are distributed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| promoter | address | The promoter receiving a payout. |
| venue | address | The venue to which the promoter's balance is linked. |
| amountInUSD | uint256 | The USD-denominated amount settled from promoter credits. |
| paymentInUSDC | bool | True if payout in USDC; false if swapped to LONG. |

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

Emitted after a USDC→LONG swap via Uniswap V3.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address receiving LONG. |
| amountIn | uint256 | The USDC input amount. |
| amountOut | uint256 | The LONG output amount. |

### BelongCheckInStorage

Top-level storage bundle for program configuration.

```solidity
struct BelongCheckInStorage {
  struct BelongCheckIn.Contracts contracts;
  struct BelongCheckIn.PaymentsInfo paymentsInfo;
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
}
```

### PaymentsInfo

Uniswap routing and token addresses.
Slippage tolerance scaled to 27 decimals where 1e27 == 100%.

_Used by Helper.amountOutMin via BelongCheckIn._swapUSDCtoLONG; valid range [0, 1e27].
@dev
- `swapPoolFees` is the 3-byte fee tier used for both USDC↔W_NATIVE_CURRENCY and W_NATIVE_CURRENCY↔LONG hops.
- `wNativeCurrency`, `usdc`, `long` are token addresses; `swapV3Router` and `swapV3Quoter` are periphery contracts._

```solidity
struct PaymentsInfo {
  uint96 slippageBps;
  uint24 swapPoolFees;
  address swapV3Factory;
  address swapV3Router;
  address swapV3Quoter;
  address wNativeCurrency;
  address usdc;
  address long;
  uint256 maxPriceFeedDelay;
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

### VenueStakingRewardInfo

Per-tier venue-side fee settings.

_`depositFeePercentage` scaled by 1e4; `convenienceFeeAmount` is a flat USDC amount (native decimals)._

```solidity
struct VenueStakingRewardInfo {
  uint24 depositFeePercentage;
  uint128 convenienceFeeAmount;
}
```

### PromoterStakingRewardInfo

Per-tier promoter payout configuration.

_Percentages scaled by 1e4; separate values for USDC or LONG payouts._

```solidity
struct PromoterStakingRewardInfo {
  uint24 usdcPercentage;
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

### constructor

```solidity
constructor() public
```

Disables initializers for the implementation contract.

### initialize

```solidity
function initialize(address _owner, struct BelongCheckIn.PaymentsInfo _paymentsInfo) external
```

Initializes core parameters and default tier tables; sets the owner.
@dev
- Computes a default $5 USDC convenience fee using `MetadataReaderLib.readDecimals()`.
- Installs default `Fees` and `RewardsInfo[5]` arrays.
- Must be called exactly once.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | The address granted ownership. |
| _paymentsInfo | struct BelongCheckIn.PaymentsInfo | Uniswap/asset configuration to be stored. |

### setParameters

```solidity
function setParameters(struct BelongCheckIn.PaymentsInfo _paymentsInfo, struct BelongCheckIn.Fees _fees, struct BelongCheckIn.RewardsInfo[5] _stakingRewards) external
```

Owner-only method to update core parameters in a single call.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _paymentsInfo | struct BelongCheckIn.PaymentsInfo | New Uniswap/asset configuration. |
| _fees | struct BelongCheckIn.Fees | New platform fee configuration (scaled by 1e4). |
| _stakingRewards | struct BelongCheckIn.RewardsInfo[5] | New tier table (array index maps to `StakingTiers`). |

### setContracts

```solidity
function setContracts(struct BelongCheckIn.Contracts _contracts) external
```

Owner-only method to update external contract references.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contracts | struct BelongCheckIn.Contracts | Struct of contract references (Factory, Escrow, Staking, tokens, price feed). |

### updateVenueRules

```solidity
function updateVenueRules(struct VenueRules rules) external
```

Allows a venue to update its rules after a balance check.

_Reverts with `NotAVenue()` if caller has zero venue credits._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| rules | struct VenueRules | The new `VenueRules` to set for the caller. |

### venueDeposit

```solidity
function venueDeposit(struct VenueInfo venueInfo) external
```

Handles a venue USDC deposit, affiliate fee processing, convenience fee, and escrow funding.
@dev
- Signature-validated via platform signer from `Factory`.
- Applies staking-tier-based `depositFeePercentage` unless remaining free credits > 0.
- Charges convenience + affiliate fees in USDC, swaps convenience fee to LONG, and forwards USDC to `Escrow`.
- Mints venue credits (ERC1155) representing USD units deposited.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venueInfo | struct VenueInfo | Signed venue deposit parameters (venue, amount, referral code, rules, uri). |

### payToVenue

```solidity
function payToVenue(struct CustomerInfo customerInfo) external
```

Processes a customer payment to a venue, optionally attributing promoter rewards.
@dev
- Signature-validated via platform signer from `Factory`.
- If a promoter is present, burns venue credits and mints promoter credits in USD units.
- If `paymentInUSDC` is true: transfers USDC from customer to venue.
- If false: applies subsidy minus processing fee via `Escrow`, then transfers discounted LONG from customer to venue.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| customerInfo | struct CustomerInfo | Signed customer payment parameters (customer, venue, promoter, amount, flags, bounties). |

### distributePromoterPayments

```solidity
function distributePromoterPayments(struct PromoterInfo promoterInfo) external
```

Settles promoter credits into a payout in either USDC or LONG.
@dev
- Signature-validated via platform signer from `Factory`.
- Applies tiered platform fee based on `Staking` balance of the promoter.
- For USDC payout: pulls from `Escrow` venue deposit to feeCollector and promoter.
- For LONG payout: pulls USDC from `Escrow`, swaps to LONG (fee + promoter portions), and transfers out.
- Burns promoter credits by the settled USD amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| promoterInfo | struct PromoterInfo | Signed settlement parameters (promoter, venue, amountInUSD, payout currency flag). |

### emergencyCancelPayment

```solidity
function emergencyCancelPayment(address venue, address promoter) external
```

Owner-only emergency function to cancel all promoter credits for a venue and restore them to the venue.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venue | address | The venue whose credits will be restored. |
| promoter | address | The promoter whose credits will be burned. |

### contracts

```solidity
function contracts() external view returns (struct BelongCheckIn.Contracts contracts_)
```

Returns external contract references.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| contracts_ | struct BelongCheckIn.Contracts | The `Contracts` struct currently in use. |

### fees

```solidity
function fees() external view returns (struct BelongCheckIn.Fees fees_)
```

Returns platform fee configuration.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| fees_ | struct BelongCheckIn.Fees | The `Fees` struct currently in use. |

### paymentsInfo

```solidity
function paymentsInfo() external view returns (struct BelongCheckIn.PaymentsInfo paymentsInfo_)
```

Returns Uniswap/asset configuration.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| paymentsInfo_ | struct BelongCheckIn.PaymentsInfo | The `PaymentsInfo` struct currently in use. |

### _swapUSDCtoLONG

```solidity
function _swapUSDCtoLONG(address recipient, uint256 amount) internal virtual returns (uint256 swapped)
```

Swaps exact USDC amount to LONG and sends proceeds to `recipient`.
@dev
- Builds a multi-hop path USDC → W_NATIVE_CURRENCY → LONG using the same fee tier.
- Uses Quoter to set a conservative `amountOutMinimum`.
- Approves router for the exact USDC amount before calling.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The recipient of LONG. If zero or `amount` is zero, returns 0 without swapping. |
| amount | uint256 | The USDC input amount to swap (USDC native decimals). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| swapped | uint256 | The amount of LONG received. |

### _swapLONGtoUSDC

```solidity
function _swapLONGtoUSDC(address recipient, uint256 amount) internal virtual returns (uint256 swapped)
```

Swaps exact LONG amount to USDC and sends proceeds to `recipient`.
@dev
- Builds a multi-hop path LONG → W_NATIVE_CURRENCY → USDC using the same fee tier.
- Uses Quoter to set a conservative `amountOutMinimum`.
- Approves router for the exact LONG amount before calling.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The recipient of USDC. If zero or `amount` is zero, returns 0 without swapping. |
| amount | uint256 | The LONG input amount to swap (LONG native decimals). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| swapped | uint256 | The amount of USDC received. |

### _swapExact

```solidity
function _swapExact(address tokenIn, address tokenOut, address recipient, uint256 amount) internal returns (uint256 swapped)
```

_Common swap executor with minimal approvals and conservative slippage._

### _buildPath

```solidity
function _buildPath(struct BelongCheckIn.PaymentsInfo _paymentsInfo, address tokenIn, address tokenOut) internal view returns (bytes path)
```

_Builds the best-available path between `tokenIn` and `tokenOut`.
     Prefers direct pool, otherwise routes via W_NATIVE_CURRENCY using the same fee tier._

