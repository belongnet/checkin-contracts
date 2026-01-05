# BelongCheckIn
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/platform/BelongCheckIn.sol)

**Inherits:**
Initializable, Ownable, [DualDexSwapV4](/contracts/v2/platform/extensions/DualDexSwapV4.sol/abstract.DualDexSwapV4.md)

**Title:**
BelongCheckIn

Coordinates venue deposits, customer check-ins, and promoter settlements for the Belong program.


- Maintains venue and promoter balances as denominated ERC1155 credits (1 credit == 1 USD unit).
- Delegates token custody to {Escrow} while enforcing platform fees, referral incentives, and staking perks.
- Prices and swaps LONG through a dual DEX (Uniswap v4 / Pancake Infinity) router while deriving slippage bounds from a Chainlink price feed.
- Applies staking-tier-dependent deposit fees, customer discounts, and promoter fee splits.
- Streams platform revenue through a buyback-and-burn routine before forwarding the remainder to Factory.platformAddress.
- All externally triggered flows require EIP-712 signatures produced by the platform signer held in {Factory}.


## State Variables
### DEAD
Fallback burn address used if direct `burn` reverts.


```solidity
address private constant DEAD = 0x000000000000000000000000000000000000dEaD
```


### belongCheckInStorage
Global program configuration.


```solidity
BelongCheckInStorage public belongCheckInStorage
```


### generalVenueInfo
Per-venue rule set and remaining free deposit credits.

Keyed by venue address.


```solidity
mapping(address venue => GeneralVenueInfo info) public generalVenueInfo
```


### stakingRewards
Staking-tier-indexed rewards configuration.

Indexed by `StakingTiers` enum value [0..4].


```solidity
mapping(StakingTiers tier => RewardsInfo rewardInfo) public stakingRewards
```


## Functions
### onlyEOA


```solidity
modifier onlyEOA() ;
```

### constructor

Disables initializers for the implementation contract.

**Note:**
oz-upgrades-unsafe-allow: constructor


```solidity
constructor() ;
```

### initialize

Initializes core parameters, default tier tables, and transfers ownership.


- Derives a $5 convenience charge in native USDtoken decimals through `MetadataReaderLib.readDecimals`.
- Seeds default [Fees](/contracts/v2/platform/BelongCheckIn.sol/contract.BelongCheckIn.md#fees) and full 5-tier [RewardsInfo](/contracts/v2/platform/BelongCheckIn.sol/contract.BelongCheckIn.md#rewardsinfo) tables used until `setParameters` is invoked.
- Callable exactly once; subsequent calls revert via {Initializable}.


```solidity
function initialize(address _owner, DualDexSwapV4Lib.PaymentsInfo calldata paymentsInfo_) external initializer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_owner`|`address`|Address that will gain `onlyOwner` privileges.|
|`paymentsInfo_`|`DualDexSwapV4Lib.PaymentsInfo`|Initial swap + asset configuration to persist.|


### setParameters

Owner-only convenience wrapper to replace swap configuration, fee knobs, and tier tables atomically.


```solidity
function setParameters(
    DualDexSwapV4Lib.PaymentsInfo calldata paymentsInfo_,
    Fees calldata _fees,
    RewardsInfo[5] memory _stakingRewards
) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`paymentsInfo_`|`DualDexSwapV4Lib.PaymentsInfo`|Fresh DEX + asset configuration to persist.|
|`_fees`|`Fees`|Revised fee settings scaled by 1e4 (basis points domain).|
|`_stakingRewards`|`RewardsInfo[5]`|Replacement 5-element rewards array (index matches {StakingTiers}).|


### setPaymentsInfo

Owner-only method to update swap routing and asset configuration.


```solidity
function setPaymentsInfo(DualDexSwapV4Lib.PaymentsInfo calldata paymentsInfo_) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`paymentsInfo_`|`DualDexSwapV4Lib.PaymentsInfo`|New DEX + asset configuration to persist.|


### setFees

Owner-only method to update platform fee configuration.


```solidity
function setFees(Fees calldata _fees) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_fees`|`Fees`|New fee settings (basis points scaled by 1e4).|


### setRewards

Owner-only method to update staking rewards tiers.


```solidity
function setRewards(RewardsInfo[5] memory _stakingRewards) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_stakingRewards`|`RewardsInfo[5]`|New rewards configuration for all tiers.|


### setContracts

Owner-only method to update external contract references used by the module.


```solidity
function setContracts(Contracts calldata _contracts) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_contracts`|`Contracts`|Set of contract dependencies (Factory, Escrow, Staking, venue/promoter tokens, price feed).|


### updateVenueRules

Allows a venue to change its rule configuration provided it still holds venue credits.

Reverts with `NotAVenue()` when the caller has no outstanding credits (i.e. has not deposited yet).


```solidity
function updateVenueRules(VenueRules calldata rules) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`rules`|`VenueRules`|The updated `VenueRules` payload for the caller.|


### withdrawUnusedUSD

Allows a venue to withdraw unused USDtoken deposits when no promoter payouts occur.


```solidity
function withdrawUnusedUSD(uint256 amount) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`amount`|`uint256`|Amount of USDtoken to withdraw.|


### venueDeposit

Handles a venue USDtoken deposit, accounting for fee exemptions, affiliate rewards, and escrow funding.


- Signature-validated via platform signer from `Factory`.
- Tracks “free deposit” credits; the platform fee is skipped until the configured allowance is exhausted.
- Charges convenience plus affiliate fees in USDtoken, swaps them to LONG where applicable, and records the resulting LONG in escrow.
- Applies the buyback/burn split to the platform fee portion before forwarding the remainder to the fee collector.
- Forwards the full venue deposit to {Escrow} and mints venue credits to mirror the USD balance.


```solidity
function venueDeposit(VenueInfo calldata venueInfo, SignatureVerifier.SignatureProtection calldata protection)
    external
    onlyEOA;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`venueInfo`|`VenueInfo`|Signed venue deposit parameters (venue, amount, referral code, venue rules, metadata URI).|
|`protection`|`SignatureVerifier.SignatureProtection`||


### venueDepositWithDeadline


```solidity
function venueDepositWithDeadline(
    VenueInfo calldata venueInfo,
    SignatureVerifier.SignatureProtection calldata protection,
    uint256 swapDeadline
) external onlyEOA;
```

### venueDepositFees


```solidity
function venueDepositFees(address venue, uint256 amount, bytes32 affiliateReferralCode)
    public
    view
    returns (
        uint256 feeAmount,
        uint256 platformFee,
        uint256 convenienceFeeAmount,
        address affiliate,
        uint256 affiliateFee
    );
```

### _venueDepositFees


```solidity
function _venueDepositFees(address venue, uint256 amount, bytes32 affiliateReferralCode)
    internal
    view
    returns (VenueDepositFeesInfo memory feesInfo);
```

### _venueDeposit


```solidity
function _venueDeposit(
    VenueInfo calldata venueInfo,
    SignatureVerifier.SignatureProtection calldata protection,
    uint256 swapDeadline
) internal;
```

### payToVenue

Processes a customer payment to a venue, optionally attributing promoter rewards.


- Signature-validated via platform signer from `Factory`.
- Burns venue credits / mints promoter credits when a promoter participates in the visit.
- USDtoken payments move USDtoken directly from customer to venue.
- LONG payments pull the platform subsidy from escrow, collect the customer’s discounted LONG, then deliver/route LONG per venue rules.


```solidity
function payToVenue(CustomerInfo calldata customerInfo, SignatureVerifier.SignatureProtection calldata protection)
    external
    onlyEOA;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`customerInfo`|`CustomerInfo`|Signed customer payment parameters (customer, venue, promoter, amount, payment flags, bounty data).|
|`protection`|`SignatureVerifier.SignatureProtection`||


### payToVenueWithDeadline


```solidity
function payToVenueWithDeadline(
    CustomerInfo calldata customerInfo,
    SignatureVerifier.SignatureProtection calldata protection,
    uint256 swapDeadline
) external onlyEOA;
```

### _payToVenue


```solidity
function _payToVenue(
    CustomerInfo calldata customerInfo,
    SignatureVerifier.SignatureProtection calldata protection,
    uint256 swapDeadline
) internal;
```

### distributePromoterPayments

Settles promoter credits into an on-chain payout in either USDtoken or LONG.


- Signature-validated via platform signer from `Factory`.
- Applies tiered platform fees based on the promoter’s staked LONG in {Staking}.
- USDtoken payouts draw both fee and promoter portions from escrow; fees are streamed through `_handleRevenue`.
- LONG payouts draw USDtoken from escrow, swap the full amount using the V3 router, and subject the swapped fee portion to the buyback routine.
- Always burns promoter ERC1155 credits by the settled USD amount to prevent re-claims.


```solidity
function distributePromoterPayments(
    PromoterInfo calldata promoterInfo,
    SignatureVerifier.SignatureProtection calldata protection
) external onlyEOA;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`promoterInfo`|`PromoterInfo`|Signed settlement parameters (promoter, venue, USD amount, payout currency flag).|
|`protection`|`SignatureVerifier.SignatureProtection`||


### distributePromoterPaymentsWithDeadline


```solidity
function distributePromoterPaymentsWithDeadline(
    PromoterInfo calldata promoterInfo,
    SignatureVerifier.SignatureProtection calldata protection,
    uint256 swapDeadline
) external onlyEOA;
```

### _distributePromoterPayments


```solidity
function _distributePromoterPayments(
    PromoterInfo calldata promoterInfo,
    SignatureVerifier.SignatureProtection calldata protection,
    uint256 swapDeadline
) internal;
```

### emergencyCancelPayment

Owner-only escape hatch that restores a venue’s credits by cancelling a promoter’s balance.


```solidity
function emergencyCancelPayment(address venue, address promoter) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`venue`|`address`|Venue that will regain the promoter’s USD credits.|
|`promoter`|`address`|Promoter whose outstanding credits are burned.|


### contracts

Returns current contract dependencies.


```solidity
function contracts() external view returns (Contracts memory contracts_);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`contracts_`|`Contracts`|The persisted [Contracts](/contracts/v2/platform/BelongCheckIn.sol/contract.BelongCheckIn.md#contracts) struct.|


### fees

Returns platform fee configuration.


```solidity
function fees() external view returns (Fees memory fees_);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`fees_`|`Fees`|The persisted [Fees](/contracts/v2/platform/BelongCheckIn.sol/contract.BelongCheckIn.md#fees) struct.|


### _setParameters

Internal helper that atomically persists swap configuration, fee settings, and staking rewards.


```solidity
function _setParameters(
    DualDexSwapV4Lib.PaymentsInfo calldata paymentsInfo_,
    Fees memory _fees,
    RewardsInfo[5] memory _stakingRewards
) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`paymentsInfo_`|`DualDexSwapV4Lib.PaymentsInfo`|New DEX/asset configuration to persist.|
|`_fees`|`Fees`|New platform fee configuration.|
|`_stakingRewards`|`RewardsInfo[5]`|Replacement 5-element rewards table (by staking tier).|


### _setFees


```solidity
function _setFees(Fees memory _fees) private;
```

### _setRewards


```solidity
function _setRewards(RewardsInfo[5] memory _stakingRewards) private;
```

### _setVenueRules

Internal helper that stores rule updates after validation.

Reverts if `rules.paymentType == PaymentTypes.NoType` to prevent unusable configurations.


```solidity
function _setVenueRules(address venue, VenueRules memory rules) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`venue`|`address`|Venue whose rules will change.|
|`rules`|`VenueRules`|Rule payload that will be stored.|


### _payToVenueLONG


```solidity
function _payToVenueLONG(
    CustomerInfo calldata customerInfo,
    Fees storage fees_,
    Contracts storage _contracts,
    VenueRules storage rules,
    uint256 swapDeadline
) private;
```

### _swapUSDtokenToLONG

Swaps an exact USDtoken amount to LONG, then delivers proceeds to `recipient`.

Emits `Swapped` to maintain downstream observability.


```solidity
function _swapUSDtokenToLONG(address recipient, uint256 amount, uint256 deadline)
    internal
    override
    returns (uint256 swapped);
```

### _swapLONGtoUSDtoken

Swaps an exact LONG amount to USDtoken, then delivers proceeds to `recipient`.

Emits `Swapped` to maintain downstream observability.


```solidity
function _swapLONGtoUSDtoken(address recipient, uint256 amount, uint256 deadline)
    internal
    override
    returns (uint256 swapped);
```

### _quoteUSDtokenToLONG


```solidity
function _quoteUSDtokenToLONG(uint256 amount) internal view override returns (uint256);
```

### _quoteLONGtoUSDtoken


```solidity
function _quoteLONGtoUSDtoken(uint256 amount) internal view override returns (uint256);
```

### _handleRevenue

Splits platform revenue: swaps a configurable portion for LONG and burns it, then forwards the remainder to the fee collector.


```solidity
function _handleRevenue(address token, uint256 amount, uint256 swapDeadline) internal;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|Revenue token address (USDtoken/LONG supported; unknown tokens are forwarded intact).|
|`amount`|`uint256`|Revenue amount received by this contract.|
|`swapDeadline`|`uint256`||


### _usdToLongMinOut


```solidity
function _usdToLongMinOut(uint256 amount) private view returns (uint256 minOut);
```

### _longToUsdMinOut


```solidity
function _longToUsdMinOut(uint256 amount) private view returns (uint256 minOut);
```

### _calculateRewards


```solidity
function _calculateRewards(
    address to,
    address venue,
    uint256 venueId,
    bool paymentInUSDtoken,
    Bounties memory bounties,
    uint256 amount
) internal;
```

### _getUserStakingTier


```solidity
function _getUserStakingTier(address user) internal view returns (StakingTiers);
```

## Events
### FeesSet
Emitted when platform fee settings are updated.


```solidity
event FeesSet(Fees fees);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`fees`|`Fees`|The new fee configuration.|

### RewardsSet
Emitted when staking reward tiers are updated.


```solidity
event RewardsSet(RewardsInfo[5] rewards);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`rewards`|`RewardsInfo[5]`|The new rewards configuration for all tiers.|

### VenueRulesSet
Emitted when a venue's rules are set or updated.


```solidity
event VenueRulesSet(address indexed venue, VenueRules rules);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`venue`|`address`|The venue address.|
|`rules`|`VenueRules`|The rules applied to the venue.|

### ContractsSet
Emitted when contract references are configured.


```solidity
event ContractsSet(Contracts contracts);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`contracts`|`Contracts`|The set of external contract references.|

### VenuePaidDeposit
Emitted when a venue deposits USDtoken to the program.


```solidity
event VenuePaidDeposit(address indexed venue, bytes32 indexed referralCode, VenueRules rules, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`venue`|`address`|The venue that made the deposit.|
|`referralCode`|`bytes32`|The referral code used (if any).|
|`rules`|`VenueRules`|The rules applied to the venue at time of deposit.|
|`amount`|`uint256`|The deposited USDtoken amount (in USDtoken native decimals).|

### CustomerPaid
Emitted when a customer pays a venue (in USDtoken or LONG).


```solidity
event CustomerPaid(
    address indexed customer,
    address indexed venueToPayFor,
    address indexed promoter,
    uint256 amount,
    Bounties toCustomer,
    Bounties toPromoter
);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`customer`|`address`|The paying customer.|
|`venueToPayFor`|`address`|The venue receiving the payment.|
|`promoter`|`address`|The promoter credited, if any.|
|`amount`|`uint256`|The payment amount (USDtoken native decimals for USDtoken; LONG wei for LONG).|
|`toCustomer`|`Bounties`||
|`toPromoter`|`Bounties`||

### PromoterPaymentsDistributed
Emitted when promoter payments are distributed.


```solidity
event PromoterPaymentsDistributed(
    address indexed promoter, address indexed venue, uint256 amountInUSD, bool paymentInUSDtoken
);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`promoter`|`address`|The promoter receiving a payout.|
|`venue`|`address`|The venue to which the promoter's balance is linked.|
|`amountInUSD`|`uint256`|The USD-denominated amount settled from promoter credits.|
|`paymentInUSDtoken`|`bool`|True if payout in USDtoken; false if swapped to LONG.|

### PromoterPaymentCancelled
Emitted when the owner cancels a promoter payment and restores venue credits.


```solidity
event PromoterPaymentCancelled(address indexed venue, address indexed promoter, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`venue`|`address`|The venue whose credits are restored.|
|`promoter`|`address`|The promoter whose credits are burned.|
|`amount`|`uint256`|The amount (USD-denominated credits) canceled and restored.|

### Swapped
Emitted after a swap routed through the configured DEX.


```solidity
event Swapped(address indexed recipient, uint256 amountIn, uint256 amountOut);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`recipient`|`address`|The address receiving LONG.|
|`amountIn`|`uint256`|The USDtoken input amount.|
|`amountOut`|`uint256`|The LONG output amount.|

### RevenueBuybackBurn
Emitted when revenue is processed for buyback/burn.


```solidity
event RevenueBuybackBurn(address indexed token, uint256 gross, uint256 buyback, uint256 burnedLONG, uint256 fees);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|Revenue token address (USDtoken or LONG).|
|`gross`|`uint256`|Total revenue processed.|
|`buyback`|`uint256`|Amount allocated to buyback/burn (in revenue token units for USDtoken, LONG units for LONG).|
|`burnedLONG`|`uint256`|Amount of LONG burned (or 0 if burn failed and was handled differently).|
|`fees`|`uint256`|Amount forwarded to fee collector address.|

### BurnedLONGs
Emitted when LONG is burned or sent to a burn address as a fallback.


```solidity
event BurnedLONGs(address burnedTo, uint256 amountBurned);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`burnedTo`|`address`|Address to which LONG was sent (zero address if direct burn, `DEAD` if transferred).|
|`amountBurned`|`uint256`|Amount of LONG burned or transferred to the burn address.|

### VenueUsdWithdrawn
Emitted when a venue withdraws unused USDtoken deposits from escrow.


```solidity
event VenueUsdWithdrawn(address indexed venue, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`venue`|`address`|The withdrawing venue.|
|`amount`|`uint256`|Amount of USDtoken transferred back to the venue.|

## Errors
### WrongReferralCode
Thrown when a provided referral code has no creator mapping in the Factory.


```solidity
error WrongReferralCode(bytes32 referralCode);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`referralCode`|`bytes32`|The invalid referral code.|

### CanNotClaim
Thrown when a promoter cannot claim payouts for a venue.


```solidity
error CanNotClaim(address venue, address promoter);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`venue`|`address`|The venue address in question.|
|`promoter`|`address`|The promoter attempting to claim.|

### NotAVenue
Thrown when the caller is not recognized as a venue (no venue credits).


```solidity
error NotAVenue();
```

### NotEnoughBalance
Thrown when an action requires more balance than available.


```solidity
error NotEnoughBalance(uint256 requiredAmount, uint256 availableBalance);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`requiredAmount`|`uint256`|The amount required to proceed.|
|`availableBalance`|`uint256`|The currently available balance.|

### NotEnoughPromoterBalance
Thrown when a promoter lacks sufficient credits to distribute a payout.


```solidity
error NotEnoughPromoterBalance(uint256 requiredAmount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`requiredAmount`|`uint256`|The amount requested for distribution.|

### WrongPaymentTypeProvided
Thrown when a venue provides an invalid or disabled payment type.


```solidity
error WrongPaymentTypeProvided();
```

### ProcessingFeeExceedsSubsidy
Reverts when the processing fee percentage is configured above the subsidy percentage.


```solidity
error ProcessingFeeExceedsSubsidy();
```

### TokensCanNotBeBurned
Thrown when LONG cannot be burned or transferred to the burn address.


```solidity
error TokensCanNotBeBurned();
```

### OnlyEOA
Thrown when a contract (non-EOA) calls a restricted function.


```solidity
error OnlyEOA();
```

### ZeroAmountProvided
Thrown when a zero amount is supplied where a positive value is required.


```solidity
error ZeroAmountProvided();
```

## Structs
### BelongCheckInStorage
Top-level storage bundle for program configuration.


```solidity
struct BelongCheckInStorage {
    Contracts contracts;
    Fees fees;
}
```

### Contracts
Addresses of external contracts and oracles used by the program.

`longPF` is a Chainlink aggregator proxy implementing `ILONGPriceFeed`.


```solidity
struct Contracts {
    Factory factory;
    Escrow escrow;
    Staking staking;
    CreditToken venueToken;
    CreditToken promoterToken;
    address longPF;
}
```

### Fees
Platform fee knobs and constants.

Percentages are scaled by 1e4 (10000 == 100%).
- `referralCreditsAmount`: number of “free” credits before charging deposit fees again.
- `affiliatePercentage`: fee taken on venue deposits attributable to a referral.
- `longCustomerDiscountPercentage`: discount applied to LONG payments (customer side).
- `platformSubsidyPercentage`: LONG subsidy the platform adds for merchant when customer pays in LONG.
- `processingFeePercentage`: portion of LONG subsidy collected by the platform as processing fee.


```solidity
struct Fees {
    uint8 referralCreditsAmount;
    uint24 affiliatePercentage;
    uint24 longCustomerDiscountPercentage;
    uint24 platformSubsidyPercentage;
    uint24 processingFeePercentage;
    /// @notice Percentage of platform revenue allocated to LONG buyback and burn (BPS: 10_000 == 100%).
    uint24 buybackBurnPercentage;
}
```

### GeneralVenueInfo
Venue-specific configuration and remaining “free” deposit credits.


```solidity
struct GeneralVenueInfo {
    VenueRules rules;
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

`depositFeePercentage` scaled by 1e4; `convenienceFeeAmount` is a flat USDtoken amount (native decimals).


```solidity
struct VenueStakingRewardInfo {
    uint24 depositFeePercentage;
    uint128 convenienceFeeAmount;
}
```

### PromoterStakingRewardInfo
Per-tier promoter payout configuration.

Percentages scaled by 1e4; separate values for USDtoken or LONG payouts.


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
    PromoterStakingRewardInfo promoterStakingInfo;
    VenueStakingRewardInfo venueStakingInfo;
}
```

