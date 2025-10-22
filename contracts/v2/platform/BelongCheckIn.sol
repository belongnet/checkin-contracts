// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {MetadataReaderLib} from "solady/src/utils/MetadataReaderLib.sol";

import {Factory} from "./Factory.sol";
import {LONG} from "../tokens/LONG.sol";
import {DualDexSwapV4} from "./extensions/DualDexSwapV4.sol";
import {DualDexSwapV4Lib} from "./extensions/DualDexSwapV4Lib.sol";
import {Escrow} from "../periphery/Escrow.sol";
import {Staking} from "../periphery/Staking.sol";
import {CreditToken} from "../tokens/CreditToken.sol";

import {SignatureVerifier} from "../utils/SignatureVerifier.sol";
import {Helper} from "../utils/Helper.sol";

import {
    StakingTiers,
    VenueRules,
    PaymentTypes,
    LongPaymentTypes,
    VenueInfo,
    CustomerInfo,
    PromoterInfo,
    Bounties
} from "../Structures.sol";

/// @title BelongCheckIn
/// @notice Coordinates venue deposits, customer check-ins, and promoter settlements for the Belong program.
/// @dev
/// - Maintains venue and promoter balances as denominated ERC1155 credits (1 credit == 1 USD unit).
/// - Delegates token custody to {Escrow} while enforcing platform fees, referral incentives, and staking perks.
/// - Prices and swaps LONG through a dual DEX (Uniswap v4 / Pancake Infinity) router + quoter pairing and a Chainlink price feed.
/// - Applies staking-tier-dependent deposit fees, customer discounts, and promoter fee splits.
/// - Streams platform revenue through a buyback-and-burn routine before forwarding the remainder to Factory.platformAddress.
/// - All externally triggered flows require EIP-712 signatures produced by the platform signer held in {Factory}.
contract BelongCheckIn is Initializable, Ownable, DualDexSwapV4 {
    using SignatureVerifier for address;
    using MetadataReaderLib for address;
    using SafeTransferLib for address;
    using Helper for *;

    // ========== Errors ==========

    /// @notice Thrown when a provided referral code has no creator mapping in the Factory.
    /// @param referralCode The invalid referral code.
    error WrongReferralCode(bytes32 referralCode);

    /// @notice Thrown when a promoter cannot claim payouts for a venue.
    /// @param venue The venue address in question.
    /// @param promoter The promoter attempting to claim.
    error CanNotClaim(address venue, address promoter);

    /// @notice Thrown when the caller is not recognized as a venue (no venue credits).
    error NotAVenue();

    /// @notice Thrown when an action requires more balance than available.
    /// @param requiredAmount The amount required to proceed.
    /// @param availableBalance The currently available balance.
    error NotEnoughBalance(uint256 requiredAmount, uint256 availableBalance);

    /// @notice Thrown when a venue provides an invalid or disabled payment type.
    error WrongPaymentTypeProvided();

    /// @notice Reverts when a provided bps value exceeds the configured scaling domain.
    error BPSTooHigh();

    /// @notice Thrown when LONG cannot be burned or transferred to the burn address.
    error TokensCanNotBeBurned();

    // ========== Events ==========

    /// @notice Emitted when global parameters are updated.
    /// @param paymentsInfo DEX routing and asset addresses configuration.
    /// @param fees Platform-level fee settings.
    /// @param rewards Array of tiered staking rewards (index by `StakingTiers`).
    event ParametersSet(DualDexSwapV4Lib.PaymentsInfo paymentsInfo, Fees fees, RewardsInfo[5] rewards);

    /// @notice Emitted when a venue's rules are set or updated.
    /// @param venue The venue address.
    /// @param rules The rules applied to the venue.
    event VenueRulesSet(address indexed venue, VenueRules rules);

    /// @notice Emitted when contract references are configured.
    /// @param contracts The set of external contract references.
    event ContractsSet(Contracts contracts);

    /// @notice Emitted when a venue deposits USDC to the program.
    /// @param venue The venue that made the deposit.
    /// @param referralCode The referral code used (if any).
    /// @param rules The rules applied to the venue at time of deposit.
    /// @param amount The deposited USDC amount (in USDC native decimals).
    event VenuePaidDeposit(address indexed venue, bytes32 indexed referralCode, VenueRules rules, uint256 amount);

    /// @notice Emitted when a customer pays a venue (in USDC or LONG).
    /// @param customer The paying customer.
    /// @param venueToPayFor The venue receiving the payment.
    /// @param promoter The promoter credited, if any.
    /// @param amount The payment amount (USDC native decimals for USDC; LONG wei for LONG).
    event CustomerPaid(
        address indexed customer,
        address indexed venueToPayFor,
        address indexed promoter,
        uint256 amount,
        Bounties toCustomer,
        Bounties toPromoter
    );

    /// @notice Emitted when promoter payments are distributed.
    /// @param promoter The promoter receiving a payout.
    /// @param venue The venue to which the promoter's balance is linked.
    /// @param amountInUSD The USD-denominated amount settled from promoter credits.
    /// @param paymentInUSDC True if payout in USDC; false if swapped to LONG.
    event PromoterPaymentsDistributed(
        address indexed promoter, address indexed venue, uint256 amountInUSD, bool paymentInUSDC
    );

    /// @notice Emitted when the owner cancels a promoter payment and restores venue credits.
    /// @param venue The venue whose credits are restored.
    /// @param promoter The promoter whose credits are burned.
    /// @param amount The amount (USD-denominated credits) canceled and restored.
    event PromoterPaymentCancelled(address indexed venue, address indexed promoter, uint256 amount);

    /// @notice Emitted after a swap routed through the configured DEX.
    /// @param recipient The address receiving LONG.
    /// @param amountIn The USDC input amount.
    /// @param amountOut The LONG output amount.
    event Swapped(address indexed recipient, uint256 amountIn, uint256 amountOut);

    /// @notice Emitted when revenue is processed for buyback/burn.
    /// @param token Revenue token address (USDC or LONG).
    /// @param gross Total revenue processed.
    /// @param buyback Amount allocated to buyback/burn (in revenue token units for USDC, LONG units for LONG).
    /// @param burnedLONG Amount of LONG burned (or 0 if burn failed and was handled differently).
    /// @param fees Amount forwarded to fee collector address.
    event RevenueBuybackBurn(address indexed token, uint256 gross, uint256 buyback, uint256 burnedLONG, uint256 fees);

    /// @notice Emitted when LONG is burned or sent to a burn address as a fallback.
    /// @param burnedTo Address to which LONG was sent (zero address if direct burn, `DEAD` if transferred).
    /// @param amountBurned Amount of LONG burned or transferred to the burn address.
    event BurnedLONGs(address burnedTo, uint256 amountBurned);

    // ========== Structs ==========

    /// @notice Top-level storage bundle for program configuration.
    struct BelongCheckInStorage {
        Contracts contracts;
        DualDexSwapV4Lib.PaymentsInfo paymentsInfo;
        Fees fees;
    }

    /// @notice Addresses of external contracts and oracles used by the program.
    /// @dev `longPF` is a Chainlink aggregator proxy implementing `ILONGPriceFeed`.
    struct Contracts {
        Factory factory;
        Escrow escrow;
        Staking staking;
        CreditToken venueToken;
        CreditToken promoterToken;
        address longPF;
    }

    /// @notice Platform fee knobs and constants.
    /// @dev Percentages are scaled by 1e4 (10000 == 100%).
    /// - `referralCreditsAmount`: number of “free” credits before charging deposit fees again.
    /// - `affiliatePercentage`: fee taken on venue deposits attributable to a referral.
    /// - `longCustomerDiscountPercentage`: discount applied to LONG payments (customer side).
    /// - `platformSubsidyPercentage`: LONG subsidy the platform adds for merchant when customer pays in LONG.
    /// - `processingFeePercentage`: portion of LONG subsidy collected by the platform as processing fee.
    struct Fees {
        uint8 referralCreditsAmount;
        uint24 affiliatePercentage;
        uint24 longCustomerDiscountPercentage;
        uint24 platformSubsidyPercentage;
        uint24 processingFeePercentage;
        /// @notice Percentage of platform revenue allocated to LONG buyback and burn (BPS: 10_000 == 100%).
        uint24 buybackBurnPercentage;
    }

    /// @notice Venue-specific configuration and remaining “free” deposit credits.
    struct GeneralVenueInfo {
        VenueRules rules;
        uint16 remainingCredits;
    }

    /// @notice Per-tier venue-side fee settings.
    /// @dev `depositFeePercentage` scaled by 1e4; `convenienceFeeAmount` is a flat USDC amount (native decimals).
    struct VenueStakingRewardInfo {
        uint24 depositFeePercentage;
        uint128 convenienceFeeAmount;
    }

    /// @notice Per-tier promoter payout configuration.
    /// @dev Percentages scaled by 1e4; separate values for USDC or LONG payouts.
    struct PromoterStakingRewardInfo {
        uint24 usdcPercentage;
        uint24 longPercentage;
    }

    /// @notice Bundle of venue and promoter tier settings for a given staking tier.
    struct RewardsInfo {
        PromoterStakingRewardInfo promoterStakingInfo;
        VenueStakingRewardInfo venueStakingInfo;
    }

    // ========== State Variables ==========

    /// @notice Fallback burn address used if direct `burn` reverts.
    address private constant DEAD = 0x000000000000000000000000000000000000dEaD;
    /// @notice Global program configuration.
    BelongCheckInStorage public belongCheckInStorage;

    /// @notice Per-venue rule set and remaining free deposit credits.
    /// @dev Keyed by venue address.
    mapping(address venue => GeneralVenueInfo info) public generalVenueInfo;

    /// @notice Staking-tier-indexed rewards configuration.
    /// @dev Indexed by `StakingTiers` enum value [0..4].
    mapping(StakingTiers tier => RewardsInfo rewardInfo) public stakingRewards;

    // ========== Functions ==========

    /// @notice Disables initializers for the implementation contract.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes core parameters, default tier tables, and transfers ownership.
    /// @dev
    /// - Derives a $5 convenience charge in native USDC decimals through `MetadataReaderLib.readDecimals`.
    /// - Seeds default {Fees} and full 5-tier {RewardsInfo} tables used until `setParameters` is invoked.
    /// - Callable exactly once; subsequent calls revert via {Initializable}.
    /// @param _owner Address that will gain `onlyOwner` privileges.
    /// @param paymentsInfo_ Initial swap + asset configuration to persist.
    function initialize(address _owner, DualDexSwapV4Lib.PaymentsInfo calldata paymentsInfo_) external initializer {
        uint128 convenienceFeeAmount = uint96(5 * 10 ** paymentsInfo_.usdc.readDecimals()); // 5 USDC
        RewardsInfo[5] memory stakingRewardsInfo = [
            RewardsInfo(
                PromoterStakingRewardInfo({
                    usdcPercentage: 1000, //10%
                    longPercentage: 500 // 5%
                }),
                VenueStakingRewardInfo({
                    depositFeePercentage: 1000, //10%
                    convenienceFeeAmount: convenienceFeeAmount // $5
                })
            ),
            RewardsInfo(
                PromoterStakingRewardInfo({
                    usdcPercentage: 1000, //10%
                    longPercentage: 400 // 4%
                }),
                VenueStakingRewardInfo({
                    depositFeePercentage: 900, // 9%
                    convenienceFeeAmount: convenienceFeeAmount // $5
                })
            ),
            RewardsInfo(
                PromoterStakingRewardInfo({
                    usdcPercentage: 1000, //10%
                    longPercentage: 300 // 3%
                }),
                VenueStakingRewardInfo({
                    depositFeePercentage: 800, // 8%
                    convenienceFeeAmount: convenienceFeeAmount // $5
                })
            ),
            RewardsInfo(
                PromoterStakingRewardInfo({
                    usdcPercentage: 1000, //10%
                    longPercentage: 200 // 2%
                }),
                VenueStakingRewardInfo({
                    depositFeePercentage: 700, // 7%
                    convenienceFeeAmount: convenienceFeeAmount // $5
                })
            ),
            RewardsInfo(
                PromoterStakingRewardInfo({
                    usdcPercentage: 1000, //10%
                    longPercentage: 100 // 1%
                }),
                VenueStakingRewardInfo({
                    depositFeePercentage: 500, // 5%
                    convenienceFeeAmount: convenienceFeeAmount // $5
                })
            )
        ];

        _setParameters(
            paymentsInfo_,
            Fees({
                referralCreditsAmount: 2,
                affiliatePercentage: 1000, // 10%
                longCustomerDiscountPercentage: 300, // 3%
                platformSubsidyPercentage: 300, // 3%
                processingFeePercentage: 250, // 2.5%
                buybackBurnPercentage: 5000 // 50%
            }),
            stakingRewardsInfo
        );

        _initializeOwner(_owner);
    }

    /// @notice Owner-only convenience wrapper to replace swap configuration, fee knobs, and tier tables atomically.
    /// @param paymentsInfo_ Fresh DEX + asset configuration to persist.
    /// @param _fees Revised fee settings scaled by 1e4 (basis points domain).
    /// @param _stakingRewards Replacement 5-element rewards array (index matches {StakingTiers}).
    function setParameters(
        DualDexSwapV4Lib.PaymentsInfo calldata paymentsInfo_,
        Fees calldata _fees,
        RewardsInfo[5] memory _stakingRewards
    ) external onlyOwner {
        _setParameters(paymentsInfo_, _fees, _stakingRewards);
    }

    /// @notice Owner-only method to update external contract references used by the module.
    /// @param _contracts Set of contract dependencies (Factory, Escrow, Staking, venue/promoter tokens, price feed).
    function setContracts(Contracts calldata _contracts) external onlyOwner {
        belongCheckInStorage.contracts = _contracts;

        emit ContractsSet(_contracts);
    }

    /// @notice Allows a venue to change its rule configuration provided it still holds venue credits.
    /// @dev Reverts with `NotAVenue()` when the caller has no outstanding credits (i.e. has not deposited yet).
    /// @param rules The updated `VenueRules` payload for the caller.
    function updateVenueRules(VenueRules calldata rules) external {
        uint256 venueId = msg.sender.getVenueId();
        uint256 venueBalance = belongCheckInStorage.contracts.venueToken.balanceOf(msg.sender, venueId);
        require(venueBalance > 0, NotAVenue());

        _setVenueRules(msg.sender, rules);
    }

    /// @notice Handles a venue USDC deposit, accounting for fee exemptions, affiliate rewards, and escrow funding.
    /// @dev
    /// - Signature-validated via platform signer from `Factory`.
    /// - Tracks “free deposit” credits; the platform fee is skipped until the configured allowance is exhausted.
    /// - Charges convenience plus affiliate fees in USDC, swaps them to LONG where applicable, and records the resulting LONG in escrow.
    /// - Applies the buyback/burn split to the platform fee portion before forwarding the remainder to the fee collector.
    /// - Forwards the full venue deposit to {Escrow} and mints venue credits to mirror the USD balance.
    /// @param venueInfo Signed venue deposit parameters (venue, amount, referral code, venue rules, metadata URI).
    function venueDeposit(VenueInfo calldata venueInfo) external {
        Contracts memory contracts_ = belongCheckInStorage.contracts;
        Fees storage fees_ = belongCheckInStorage.fees;
        address usdc = _paymentsInfo.usdc;

        contracts_.factory.nftFactoryParameters().signerAddress.checkVenueInfo(venueInfo);

        VenueStakingRewardInfo memory stakingInfo =
        stakingRewards[contracts_.staking.balanceOf(venueInfo.venue).stakingTiers()].venueStakingInfo;

        address affiliate;
        uint256 affiliateFee;
        if (venueInfo.affiliateReferralCode != bytes32(0)) {
            affiliate = contracts_.factory.getReferralCreator(venueInfo.affiliateReferralCode);
            require(affiliate != address(0), WrongReferralCode(venueInfo.affiliateReferralCode));

            affiliateFee = fees_.affiliatePercentage.calculateRate(venueInfo.amount);
        }

        uint256 venueId = venueInfo.venue.getVenueId();

        if (generalVenueInfo[venueInfo.venue].remainingCredits < fees_.referralCreditsAmount) {
            unchecked {
                ++generalVenueInfo[venueInfo.venue].remainingCredits;
            }
        } else {
            // Collect deposit fee to this contract, then apply buyback/burn split and forward remainder.
            uint256 platformFee = stakingInfo.depositFeePercentage.calculateRate(venueInfo.amount);
            usdc.safeTransferFrom(venueInfo.venue, address(this), platformFee);
            _handleRevenue(usdc, platformFee);
        }

        _setVenueRules(venueInfo.venue, venueInfo.rules);

        usdc.safeTransferFrom(venueInfo.venue, address(this), stakingInfo.convenienceFeeAmount + affiliateFee);

        usdc.safeTransferFrom(venueInfo.venue, address(contracts_.escrow), venueInfo.amount);

        uint256 convenienceFeeLong = _swapUSDCtoLONG(address(contracts_.escrow), stakingInfo.convenienceFeeAmount);
        _swapUSDCtoLONG(affiliate, affiliateFee);

        contracts_.escrow.venueDeposit(venueInfo.venue, venueInfo.amount, convenienceFeeLong);

        contracts_.venueToken.mint(venueInfo.venue, venueId, venueInfo.amount, venueInfo.uri);

        emit VenuePaidDeposit(venueInfo.venue, venueInfo.affiliateReferralCode, venueInfo.rules, venueInfo.amount);
    }

    /// @notice Processes a customer payment to a venue, optionally attributing promoter rewards.
    /// @dev
    /// - Signature-validated via platform signer from `Factory`.
    /// - Burns venue credits / mints promoter credits when a promoter participates in the visit.
    /// - USDC payments move USDC directly from customer to venue.
    /// - LONG payments pull the platform subsidy from escrow, collect the customer’s discounted LONG, then deliver/route LONG per venue rules.
    /// @param customerInfo Signed customer payment parameters (customer, venue, promoter, amount, payment flags, bounty data).
    function payToVenue(CustomerInfo calldata customerInfo) external {
        Contracts memory contracts_ = belongCheckInStorage.contracts;
        Fees storage fees_ = belongCheckInStorage.fees;
        VenueRules storage rules = generalVenueInfo[customerInfo.venueToPayFor].rules;

        contracts_.factory.nftFactoryParameters().signerAddress.checkCustomerInfo(customerInfo, rules);

        uint256 venueId = customerInfo.venueToPayFor.getVenueId();

        address promoter = contracts_.factory.getReferralCreator(customerInfo.promoterReferralCode);

        _calculateRewards(
            customerInfo.customer,
            customerInfo.venueToPayFor,
            venueId,
            customerInfo.paymentInUSDC,
            customerInfo.toCustomer,
            customerInfo.amount
        );
        if (promoter != address(0)) {
            _calculateRewards(
                promoter,
                customerInfo.venueToPayFor,
                venueId,
                customerInfo.paymentInUSDC,
                customerInfo.toPromoter,
                customerInfo.amount
            );
        }

        if (customerInfo.paymentInUSDC) {
            _paymentsInfo.usdc.safeTransferFrom(customerInfo.customer, customerInfo.venueToPayFor, customerInfo.amount);
        } else {
            address long = _paymentsInfo.long;
            // platform subsidy - processing fee
            uint256 subsidyMinusFees =
                fees_.platformSubsidyPercentage.calculateRate(customerInfo.amount)
                - fees_.processingFeePercentage.calculateRate(customerInfo.amount);
            contracts_.escrow.distributeLONGDiscount(customerInfo.venueToPayFor, address(this), subsidyMinusFees);

            // customer paid amount - longCustomerDiscountPercentage (3%)
            uint256 longFromCustomer =
                customerInfo.amount - fees_.longCustomerDiscountPercentage.calculateRate(customerInfo.amount);
            long.safeTransferFrom(customerInfo.customer, address(this), longFromCustomer);

            uint256 longAmount = subsidyMinusFees + longFromCustomer;

            if (rules.longPaymentType == LongPaymentTypes.AutoStake) {
                // Approve only what is needed, then clear allowance after deposit.
                long.safeApproveWithRetry(address(contracts_.staking), longAmount);
                contracts_.staking.deposit(longAmount, customerInfo.venueToPayFor);
                long.safeApprove(address(contracts_.staking), 0);
            } else if (rules.longPaymentType == LongPaymentTypes.AutoConvert) {
                _swapLONGtoUSDC(customerInfo.venueToPayFor, longAmount);
            } else {
                long.safeTransfer(customerInfo.venueToPayFor, longAmount);
            }
        }

        emit CustomerPaid(
            customerInfo.customer,
            customerInfo.venueToPayFor,
            promoter,
            customerInfo.amount,
            customerInfo.toCustomer,
            customerInfo.toPromoter
        );
    }

    /// @notice Settles promoter credits into an on-chain payout in either USDC or LONG.
    /// @dev
    /// - Signature-validated via platform signer from `Factory`.
    /// - Applies tiered platform fees based on the promoter’s staked LONG in {Staking}.
    /// - USDC payouts draw both fee and promoter portions from escrow; fees are streamed through `_handleRevenue`.
    /// - LONG payouts draw USDC from escrow, swap the full amount using the V3 router, and subject the swapped fee portion to the buyback routine.
    /// - Always burns promoter ERC1155 credits by the settled USD amount to prevent re-claims.
    /// @param promoterInfo Signed settlement parameters (promoter, venue, USD amount, payout currency flag).
    function distributePromoterPayments(PromoterInfo memory promoterInfo) external {
        Contracts memory contracts_ = belongCheckInStorage.contracts;
        DualDexSwapV4Lib.PaymentsInfo storage payments = _paymentsInfo;

        contracts_.factory.nftFactoryParameters().signerAddress.checkPromoterPaymentDistribution(promoterInfo);

        uint256 venueId = promoterInfo.venue.getVenueId();
        address promoter = contracts_.factory.getReferralCreator(promoterInfo.promoterReferralCode);

        uint256 promoterBalance = contracts_.promoterToken.balanceOf(promoter, venueId);
        require(
            promoterBalance >= promoterInfo.amountInUSD, NotEnoughBalance(promoterInfo.amountInUSD, promoterBalance)
        );

        PromoterStakingRewardInfo memory stakingInfo =
        stakingRewards[contracts_.staking.balanceOf(promoter).stakingTiers()].promoterStakingInfo;

        uint256 toPromoter = promoterInfo.amountInUSD;
        uint24 percentage = promoterInfo.paymentInUSDC ? stakingInfo.usdcPercentage : stakingInfo.longPercentage;
        uint256 platformFees = percentage.calculateRate(toPromoter);
        unchecked {
            toPromoter -= platformFees;
        }

        if (promoterInfo.paymentInUSDC) {
            // Route platform fees here for buyback/burn split, then forward remainder.
            contracts_.escrow.distributeVenueDeposit(promoterInfo.venue, address(this), platformFees);
            _handleRevenue(payments.usdc, platformFees);
            contracts_.escrow.distributeVenueDeposit(promoterInfo.venue, promoter, toPromoter);
        } else {
            contracts_.escrow.distributeVenueDeposit(promoterInfo.venue, address(this), promoterInfo.amountInUSD);
            // Swap fee portion to this contract for burning, then forward remainder to platform.
            uint256 longFees = _swapUSDCtoLONG(address(this), platformFees);
            _handleRevenue(payments.long, longFees);
            _swapUSDCtoLONG(promoter, toPromoter);
        }

        contracts_.promoterToken.burn(promoter, venueId, promoterInfo.amountInUSD);

        emit PromoterPaymentsDistributed(
            promoter, promoterInfo.venue, promoterInfo.amountInUSD, promoterInfo.paymentInUSDC
        );
    }

    /// @notice Owner-only escape hatch that restores a venue’s credits by cancelling a promoter’s balance.
    /// @param venue Venue that will regain the promoter’s USD credits.
    /// @param promoter Promoter whose outstanding credits are burned.
    function emergencyCancelPayment(address venue, address promoter) external onlyOwner {
        Contracts memory contracts_ = belongCheckInStorage.contracts;

        uint256 venueId = venue.getVenueId();
        uint256 promoterBalance = contracts_.promoterToken.balanceOf(promoter, venueId);

        contracts_.promoterToken.burn(promoter, venueId, promoterBalance);

        contracts_.venueToken.mint(venue, venueId, promoterBalance, contracts_.venueToken.uri(venueId));

        emit PromoterPaymentCancelled(venue, promoter, promoterBalance);
    }

    /// @notice Returns current contract dependencies.
    /// @return contracts_ The persisted {Contracts} struct.
    function contracts() external view returns (Contracts memory contracts_) {
        return belongCheckInStorage.contracts;
    }

    /// @notice Returns platform fee configuration.
    /// @return fees_ The persisted {Fees} struct.
    function fees() external view returns (Fees memory fees_) {
        return belongCheckInStorage.fees;
    }

    /// @notice Internal helper that atomically persists swap configuration, fee settings, and staking rewards.
    /// @param paymentsInfo_ New DEX/asset configuration to persist.
    /// @param _fees New platform fee configuration.
    /// @param _stakingRewards Replacement 5-element rewards table (by staking tier).
    function _setParameters(
        DualDexSwapV4Lib.PaymentsInfo calldata paymentsInfo_,
        Fees memory _fees,
        RewardsInfo[5] memory _stakingRewards
    ) private {
        require(paymentsInfo_.slippageBps <= Helper.BPS, BPSTooHigh());

        _storePaymentsInfo(paymentsInfo_);
        belongCheckInStorage.paymentsInfo = paymentsInfo_;
        belongCheckInStorage.fees = _fees;

        for (uint8 i = 0; i < 5; ++i) {
            stakingRewards[StakingTiers(i)] = _stakingRewards[i];
        }

        emit ParametersSet(paymentsInfo_, _fees, _stakingRewards);
    }

    /// @notice Internal helper that stores rule updates after validation.
    /// @dev Reverts if `rules.paymentType == PaymentTypes.NoType` to prevent unusable configurations.
    /// @param venue Venue whose rules will change.
    /// @param rules Rule payload that will be stored.
    function _setVenueRules(address venue, VenueRules memory rules) private {
        require(rules.paymentType != PaymentTypes.NoType, WrongPaymentTypeProvided());
        generalVenueInfo[venue].rules = rules;

        emit VenueRulesSet(venue, rules);
    }

    /// @notice Swaps an exact USDC amount to LONG, then delivers proceeds to `recipient`.
    /// @dev Emits `Swapped` to maintain downstream observability.
    function _swapUSDCtoLONG(address recipient, uint256 amount) internal override returns (uint256 swapped) {
        swapped = super._swapUSDCtoLONG(recipient, amount);
        if (swapped > 0) {
            emit Swapped(recipient, amount, swapped);
        }
    }

    /// @notice Swaps an exact LONG amount to USDC, then delivers proceeds to `recipient`.
    /// @dev Emits `Swapped` to maintain downstream observability.
    function _swapLONGtoUSDC(address recipient, uint256 amount) internal override returns (uint256 swapped) {
        swapped = super._swapLONGtoUSDC(recipient, amount);
        if (swapped > 0) {
            emit Swapped(recipient, amount, swapped);
        }
    }

    /// @dev Splits platform revenue: swaps a configurable portion for LONG and burns it, then forwards the remainder to the fee collector.
    /// @param token Revenue token address (USDC/LONG supported; unknown tokens are forwarded intact).
    /// @param amount Revenue amount received by this contract.
    function _handleRevenue(address token, uint256 amount) internal {
        if (amount == 0) {
            return;
        }

        DualDexSwapV4Lib.PaymentsInfo storage payments = _paymentsInfo;
        BelongCheckInStorage storage _storage = belongCheckInStorage;
        address feeCollector = _storage.contracts.factory.nftFactoryParameters().platformAddress;

        uint256 buyback = _storage.fees.buybackBurnPercentage.calculateRate(amount);
        address long = payments.long;
        uint256 toBurn = token == payments.usdc  // Buyback: swap USDC portion to LONG and burn.
            ? _swapUSDCtoLONG(address(this), buyback)
            : token == long  // Burn LONG directly, forward remainder to feeCollector.
                ? buyback
                : 0; // Unknown token: forward all to feeCollector to avoid trapping funds.
        uint256 feesToCollector;

        if (toBurn == 0) {
            buyback = 0;
        }
        unchecked {
            feesToCollector = amount - buyback;
        }

        if (toBurn > 0) {
            try LONG(long).burn(toBurn) {
                emit BurnedLONGs(address(0), toBurn);
            } catch {
                try LONG(long).transfer(DEAD, toBurn) {
                    emit BurnedLONGs(DEAD, toBurn);
                } catch {
                    revert TokensCanNotBeBurned();
                }
            }
        }

        // Forward remaining fees to feeCollector.
        token.safeTransfer(feeCollector, feesToCollector);

        emit RevenueBuybackBurn(token, amount, buyback, toBurn, feesToCollector);
    }

    function _calculateRewards(
        address to,
        address venue,
        uint256 venueId,
        bool paymentInUSDC,
        Bounties memory bounties,
        uint256 amount
    ) internal {
        Contracts memory contracts_ = belongCheckInStorage.contracts;
        DualDexSwapV4Lib.PaymentsInfo storage payments = _paymentsInfo;

        uint256 rewards = paymentInUSDC
            ? bounties.visitBountyAmount + bounties.spendBountyPercentage.calculateRate(amount)
            : payments.usdc
                .unstandardize(
                    // standardization
                    payments.usdc.standardize(bounties.visitBountyAmount)
                        + bounties.spendBountyPercentage
                            .calculateRate(
                                payments.long
                                .getStandardizedPrice(contracts_.longPF, amount, payments.maxPriceFeedDelay)
                            )
                );
        uint256 venueBalance = contracts_.venueToken.balanceOf(venue, venueId);
        require(venueBalance >= rewards, NotEnoughBalance(rewards, venueBalance));

        contracts_.venueToken.burn(venue, venueId, rewards);
        contracts_.promoterToken.mint(to, venueId, rewards, contracts_.venueToken.uri(venueId));
    }

    /// @dev Builds the optimal encoded path for the configured V3 router, preferring a direct pool and otherwise routing through the configured wrapped native token.
}
