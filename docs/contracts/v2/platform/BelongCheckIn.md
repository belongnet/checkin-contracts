# Solidity API

## BelongCheckIn

Coordinates venue deposits, customer check-ins, and promoter settlements for the Belong program.
@dev
- Maintains venue and promoter balances as denominated ERC1155 credits (1 credit == 1 USD unit).
- Delegates token custody to {Escrow} while enforcing platform fees, referral incentives, and staking perks.
- Prices and swaps LONG through a configured DEX router while deriving swap limits from a Chainlink price feed.
- Applies staking-tier-dependent deposit fees, customer discounts, and promoter fee splits.
- Streams platform revenue through a buyback-and-burn routine before forwarding the remainder to Factory.platformAddress.
- All externally triggered flows require backend signatures verified via {SignatureVerifier}
  (keccak256(abi.encode(...)) with nonce/deadline and chainId).

### Deployment and Wiring

- Deploy behind a proxy and call `initialize(owner, paymentsInfo)`.
- Deploy `Escrow` and call `Escrow.initialize(belongCheckIn)`.
- Call `setContracts` with `Factory`, `Escrow`, `Staking`, venue/promoter `CreditToken`,
  and the LONG price feed address.
- Ensure `Factory.nftFactoryParameters().signerAddress` is set; this signer is required
  for venue deposits, customer payments, and promoter settlements.
- Note: `venueDeposit`, `payToVenue`, and `distributePromoterPayments` are EOA-only.

### Core Flows (Brief)

- `venueDeposit`: collects USDtoken + fees, mints venue credits, records escrow balances.
- `payToVenue`: burns venue credits to mint promoter credits, collects USDtoken or LONG
  payments, and routes LONG per venue rules.
- `distributePromoterPayments`: burns promoter credits, pays out in USDtoken or LONG,
  and routes platform fees through buyback/burn.

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

### TokensCanNotBeBurned

```solidity
error TokensCanNotBeBurned()
```

Thrown when LONG cannot be burned or transferred to the burn address.

### SwapFailed

```solidity
error SwapFailed(address tokenIn, address tokenOut, uint256 amount)
```

Thrown when a Uniswap V3 swap fails for the provided tokens/amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | Asset that was being swapped from. |
| tokenOut | address | Asset that was being swapped to. |
| amount | uint256 | Exact input amount that failed to execute. |

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

### RevenueBuybackBurn

```solidity
event RevenueBuybackBurn(address token, uint256 gross, uint256 buyback, uint256 burnedLONG, uint256 fees)
```

Emitted when revenue is processed for buyback/burn.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | Revenue token address (USDC or LONG). |
| gross | uint256 | Total revenue processed. |
| buyback | uint256 | Amount allocated to buyback/burn (in revenue token units for USDC, LONG units for LONG). |
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
  uint24 buybackBurnPercentage;
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

Initializes core parameters, default tier tables, and transfers ownership.
@dev
- Derives a $5 convenience charge in native USDC decimals through `MetadataReaderLib.readDecimals`.
- Seeds default {Fees} and full 5-tier {RewardsInfo} tables used until `setParameters` is invoked.
- Callable exactly once; subsequent calls revert via {Initializable}.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | Address that will gain `onlyOwner` privileges. |
| _paymentsInfo | struct BelongCheckIn.PaymentsInfo | Initial swap + asset configuration to persist. |

### setParameters

```solidity
function setParameters(struct BelongCheckIn.PaymentsInfo _paymentsInfo, struct BelongCheckIn.Fees _fees, struct BelongCheckIn.RewardsInfo[5] _stakingRewards) external
```

Owner-only convenience wrapper to replace swap configuration, fee knobs, and tier tables atomically.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _paymentsInfo | struct BelongCheckIn.PaymentsInfo | Fresh Uniswap + asset configuration to persist. |
| _fees | struct BelongCheckIn.Fees | Revised fee settings scaled by 1e4 (basis points domain). |
| _stakingRewards | struct BelongCheckIn.RewardsInfo[5] | Replacement 5-element rewards array (index matches {StakingTiers}). |

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

### venueDeposit

```solidity
function venueDeposit(struct VenueInfo venueInfo) external
```

Handles a venue USDC deposit, accounting for fee exemptions, affiliate rewards, and escrow funding.
@dev
- Signature-validated via platform signer from `Factory`.
- Tracks “free deposit” credits; the platform fee is skipped until the configured allowance is exhausted.
- Charges convenience plus affiliate fees in USDC, swaps them to LONG where applicable, and records the resulting LONG in escrow.
- Applies the buyback/burn split to the platform fee portion before forwarding the remainder to the fee collector.
- Forwards the full venue deposit to {Escrow} and mints venue credits to mirror the USD balance.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venueInfo | struct VenueInfo | Signed venue deposit parameters (venue, amount, referral code, venue rules, metadata URI). |

### payToVenue

```solidity
function payToVenue(struct CustomerInfo customerInfo) external
```

Processes a customer payment to a venue, optionally attributing promoter rewards.
@dev
- Signature-validated via platform signer from `Factory`.
- Burns venue credits / mints promoter credits when a promoter participates in the visit.
- USDC payments move USDC directly from customer to venue.
- LONG payments pull the platform subsidy from escrow, collect the customer’s discounted LONG, then deliver/route LONG per venue rules.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| customerInfo | struct CustomerInfo | Signed customer payment parameters (customer, venue, promoter, amount, payment flags, bounty data). |

### distributePromoterPayments

```solidity
function distributePromoterPayments(struct PromoterInfo promoterInfo) external
```

Settles promoter credits into an on-chain payout in either USDC or LONG.
@dev
- Signature-validated via platform signer from `Factory`.
- Applies tiered platform fees based on the promoter’s staked LONG in {Staking}.
- USDC payouts draw both fee and promoter portions from escrow; fees are streamed through `_handleRevenue`.
- LONG payouts draw USDC from escrow, swap the full amount using the V3 router, and subject the swapped fee portion to the buyback routine.
- Always burns promoter ERC1155 credits by the settled USD amount to prevent re-claims.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| promoterInfo | struct PromoterInfo | Signed settlement parameters (promoter, venue, USD amount, payout currency flag). |

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

### paymentsInfo

```solidity
function paymentsInfo() external view returns (struct BelongCheckIn.PaymentsInfo paymentsInfo_)
```

Returns Uniswap/asset configuration.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| paymentsInfo_ | struct BelongCheckIn.PaymentsInfo | The persisted {PaymentsInfo} struct. |

### _swapUSDCtoLONG

```solidity
function _swapUSDCtoLONG(address recipient, uint256 amount) internal virtual returns (uint256 swapped)
```

Swaps an exact USDC amount to LONG, then delivers proceeds to `recipient`.
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

Swaps an exact LONG amount to USDC, then delivers proceeds to `recipient`.
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

_Common swap executor that builds the path, quotes slippage-aware minimums, and clears approvals on completion._

### _handleRevenue

```solidity
function _handleRevenue(address token, uint256 amount) internal
```

_Splits platform revenue: swaps a configurable portion for LONG and burns it, then forwards the remainder to the fee collector._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | Revenue token address (USDC/LONG supported; unknown tokens are forwarded intact). |
| amount | uint256 | Revenue amount received by this contract. |

### _buildPath

```solidity
function _buildPath(struct BelongCheckIn.PaymentsInfo _paymentsInfo, address tokenIn, address tokenOut) internal view returns (bytes path)
```

_Builds the optimal encoded path for the configured V3 router, preferring a direct pool and otherwise routing through the configured wrapped native token._
