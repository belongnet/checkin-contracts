// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {MetadataReaderLib} from "solady/src/utils/MetadataReaderLib.sol";
import {IUniswapV3Factory} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import {ISwapRouter as IUniswapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IQuoter as IUniswapQuoter} from "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import {IPancakeV3Factory} from "@pancakeswap/v3-core/contracts/interfaces/IPancakeV3Factory.sol";
import {ISwapRouter as IPancakeswapRouter} from "@pancakeswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IQuoter as IPancakeswapQuoter} from "@pancakeswap/v3-periphery/contracts/interfaces/IQuoter.sol";

import {Factory} from "./Factory.sol";
import {Escrow} from "../periphery/Escrow.sol";
import {Staking} from "../periphery/Staking.sol";
import {CreditToken} from "../tokens/CreditToken.sol";
import {ILONGPriceFeed} from "../interfaces/ILONGPriceFeed.sol";
import {SignatureVerifier} from "../utils/SignatureVerifier.sol";
import {Helper} from "../utils/Helper.sol";

import {
    StakingTiers,
    VenueRules,
    PaymentTypes,
    BountyTypes,
    LongPaymentTypes,
    VenueInfo,
    CustomerInfo,
    PromoterInfo
} from "../Structures.sol";

/// @title BelongCheckIn
/// @notice Orchestrates venue deposits, customer payments, and promoter payouts for a
///         referral-based commerce program with dual-token accounting (USDC/LONG).
/// @dev
/// - Uses ERC1155 credits (`CreditToken`) to track venue balances and promoter entitlements in USD units.
/// - Delegates custody and distribution of USDC/LONG to `Escrow`.
/// - Prices LONG via a Chainlink feed (`ILONGPriceFeed`) and swaps USDC→LONG on Uniswap V3.
/// - Applies tiered fees/discounts depending on staked balance in `Staking`.
/// - Signature-gated actions are authorized through a platform signer configured in `Factory`.
contract BelongCheckIn is Initializable, Ownable {
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

    /// @notice Thrown when no valid swap path is found for a USDC→LONG OR LONG→USDC swap.
    error NoValidSwapPath();

    // ========== Events ==========

    /// @notice Emitted when global parameters are updated.
    /// @param paymentsInfo Uniswap/asset addresses and pool fee configuration.
    /// @param fees Platform-level fee settings.
    /// @param rewards Array of tiered staking rewards (index by `StakingTiers`).
    event ParametersSet(PaymentsInfo paymentsInfo, Fees fees, RewardsInfo[5] rewards);

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
    /// @param visitBountyAmount Flat bounty component (USDC native decimals) if paying in USDC; standardized in logic for LONG.
    /// @param spendBountyPercentage Percentage bounty on spend (scaled by 1e4 where 10000 == 100%).
    event CustomerPaid(
        address indexed customer,
        address indexed venueToPayFor,
        address indexed promoter,
        uint256 amount,
        uint24 visitBountyAmount,
        uint24 spendBountyPercentage
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

    /// @notice Emitted after a USDC→LONG swap via Uniswap V3.
    /// @param recipient The address receiving LONG.
    /// @param amountIn The USDC input amount.
    /// @param amountOut The LONG output amount.
    event Swapped(address indexed recipient, uint256 amountIn, uint256 amountOut);

    // ========== Structs ==========

    /// @notice Top-level storage bundle for program configuration.
    struct BelongCheckInStorage {
        Contracts contracts;
        PaymentsInfo paymentsInfo;
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
    }

    /// @notice Uniswap routing and token addresses.
    /// @notice Slippage tolerance scaled to 27 decimals where 1e27 == 100%.
    /// @dev Used by Helper.amountOutMin via BelongCheckIn._swapUSDCtoLONG; valid range [0, 1e27].
    /// @dev
    /// - `swapPoolFees` is the 3-byte fee tier used for both USDC↔WETH and WETH↔LONG hops.
    /// - `weth`, `usdc`, `long` are token addresses; `swapV3Router` and `swapV3Quoter` are periphery contracts.
    struct PaymentsInfo {
        uint96 slippageBps;
        uint24 swapPoolFees;
        address swapV3Factory;
        address swapV3Router;
        address swapV3Quoter;
        address weth;
        address usdc;
        address long;
        uint256 maxPriceFeedDelay;
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
        uint24 convenienceFeeAmount;
    }

    /// @notice Per-tier promoter payout configuration.
    /// @dev Percentages scaled by 1e4; separate values for USDC or LONG payouts.
    struct PromoterStakingRewardInfo {
        uint24 usdcPercentage;
        uint24 longPercentage;
    }

    /// @notice Bundle of venue and promoter tier settings for a given staking tier.
    struct RewardsInfo {
        VenueStakingRewardInfo venueStakingInfo;
        PromoterStakingRewardInfo promoterStakingInfo;
    }

    // ========== State Variables ==========

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

    /// @notice Initializes core parameters and default tier tables; sets the owner.
    /// @dev
    /// - Computes a default $5 USDC convenience fee using `MetadataReaderLib.readDecimals()`.
    /// - Installs default `Fees` and `RewardsInfo[5]` arrays.
    /// - Must be called exactly once.
    /// @param _owner The address granted ownership.
    /// @param _paymentsInfo Uniswap/asset configuration to be stored.
    function initialize(address _owner, PaymentsInfo calldata _paymentsInfo) external initializer {
        uint24 convenienceFeeAmount = uint24(5 * 10 ** _paymentsInfo.usdc.readDecimals()); // 5 USDC
        RewardsInfo[5] memory stakingRewardsInfo = [
            RewardsInfo(
                VenueStakingRewardInfo({
                    depositFeePercentage: 1000, //10%
                    convenienceFeeAmount: convenienceFeeAmount // $5
                }),
                PromoterStakingRewardInfo({
                    usdcPercentage: 1000, //10%
                    longPercentage: 800 // 8%
                })
            ),
            RewardsInfo(
                VenueStakingRewardInfo({
                    depositFeePercentage: 900, // 9%
                    convenienceFeeAmount: convenienceFeeAmount // $5
                }),
                PromoterStakingRewardInfo({
                    usdcPercentage: 1000, //10%
                    longPercentage: 700 // 7%
                })
            ),
            RewardsInfo(
                VenueStakingRewardInfo({
                    depositFeePercentage: 800, // 8%
                    convenienceFeeAmount: convenienceFeeAmount // $5
                }),
                PromoterStakingRewardInfo({
                    usdcPercentage: 1000, //10%
                    longPercentage: 600 // 6%
                })
            ),
            RewardsInfo(
                VenueStakingRewardInfo({
                    depositFeePercentage: 700, // 7%
                    convenienceFeeAmount: convenienceFeeAmount // $5
                }),
                PromoterStakingRewardInfo({
                    usdcPercentage: 1000, //10%
                    longPercentage: 500 // 5%
                })
            ),
            RewardsInfo(
                VenueStakingRewardInfo({
                    depositFeePercentage: 500, // 5%
                    convenienceFeeAmount: convenienceFeeAmount // $5
                }),
                PromoterStakingRewardInfo({
                    usdcPercentage: 1000, //10%
                    longPercentage: 400 // 4%
                })
            )
        ];

        _setParameters(
            _paymentsInfo,
            Fees({
                referralCreditsAmount: 3,
                affiliatePercentage: 1000, // 10%
                longCustomerDiscountPercentage: 300, // 3%
                platformSubsidyPercentage: 300, // 3%
                processingFeePercentage: 250 // 2.5%
            }),
            stakingRewardsInfo
        );

        _initializeOwner(_owner);
    }

    /// @notice Owner-only method to update core parameters in a single call.
    /// @param _paymentsInfo New Uniswap/asset configuration.
    /// @param _fees New platform fee configuration (scaled by 1e4).
    /// @param _stakingRewards New tier table (array index maps to `StakingTiers`).
    function setParameters(
        PaymentsInfo calldata _paymentsInfo,
        Fees calldata _fees,
        RewardsInfo[5] memory _stakingRewards
    ) external onlyOwner {
        _setParameters(_paymentsInfo, _fees, _stakingRewards);
    }

    /// @notice Owner-only method to update external contract references.
    /// @param _contracts Struct of contract references (Factory, Escrow, Staking, tokens, price feed).
    function setContracts(Contracts calldata _contracts) external onlyOwner {
        belongCheckInStorage.contracts = _contracts;

        emit ContractsSet(_contracts);
    }

    /// @notice Allows a venue to update its rules after a balance check.
    /// @dev Reverts with `NotAVenue()` if caller has zero venue credits.
    /// @param rules The new `VenueRules` to set for the caller.
    function updateVenueRules(VenueRules calldata rules) external {
        uint256 venueId = msg.sender.getVenueId();
        uint256 venueBalance = belongCheckInStorage.contracts.venueToken.balanceOf(msg.sender, venueId);
        require(venueBalance > 0, NotAVenue());

        _setVenueRules(msg.sender, rules);
    }

    /// @notice Handles a venue USDC deposit, affiliate fee processing, convenience fee, and escrow funding.
    /// @dev
    /// - Signature-validated via platform signer from `Factory`.
    /// - Applies staking-tier-based `depositFeePercentage` unless remaining free credits > 0.
    /// - Charges convenience + affiliate fees in USDC, swaps convenience fee to LONG, and forwards USDC to `Escrow`.
    /// - Mints venue credits (ERC1155) representing USD units deposited.
    /// @param venueInfo Signed venue deposit parameters (venue, amount, referral code, rules, uri).
    function venueDeposit(VenueInfo calldata venueInfo) external {
        BelongCheckInStorage memory _storage = belongCheckInStorage;

        _storage.contracts.factory.nftFactoryParameters().signerAddress.checkVenueInfo(venueInfo);

        VenueStakingRewardInfo memory stakingInfo =
            stakingRewards[_storage.contracts.staking.balanceOf(venueInfo.venue).stakingTiers()].venueStakingInfo;

        address affiliate;
        uint256 affiliateFee;
        if (venueInfo.referralCode != bytes32(0)) {
            affiliate = _storage.contracts.factory.getReferralCreator(venueInfo.referralCode);
            require(affiliate != address(0), WrongReferralCode(venueInfo.referralCode));

            affiliateFee = _storage.fees.affiliatePercentage.calculateRate(venueInfo.amount);
        }

        address feeCollector = _storage.contracts.factory.nftFactoryParameters().platformAddress;
        uint256 venueId = venueInfo.venue.getVenueId();

        if (generalVenueInfo[venueInfo.venue].remainingCredits < _storage.fees.referralCreditsAmount) {
            unchecked {
                ++generalVenueInfo[venueInfo.venue].remainingCredits;
            }
        } else {
            _storage.paymentsInfo.usdc.safeTransferFrom(
                venueInfo.venue, feeCollector, stakingInfo.depositFeePercentage.calculateRate(venueInfo.amount)
            );
        }

        _setVenueRules(venueInfo.venue, venueInfo.rules);

        _storage.paymentsInfo.usdc.safeTransferFrom(
            venueInfo.venue, address(this), stakingInfo.convenienceFeeAmount + affiliateFee
        );

        _storage.paymentsInfo.usdc.safeTransferFrom(
            venueInfo.venue, address(_storage.contracts.escrow), venueInfo.amount
        );

        uint256 convenienceFeeLong =
            _swapUSDCtoLONG(address(_storage.contracts.escrow), stakingInfo.convenienceFeeAmount);
        _swapUSDCtoLONG(affiliate, affiliateFee);

        _storage.contracts.escrow.venueDeposit(venueInfo.venue, venueInfo.amount, convenienceFeeLong);

        _storage.contracts.venueToken.mint(venueInfo.venue, venueId, venueInfo.amount, venueInfo.uri);

        emit VenuePaidDeposit(venueInfo.venue, venueInfo.referralCode, venueInfo.rules, venueInfo.amount);
    }

    /// @notice Processes a customer payment to a venue, optionally attributing promoter rewards.
    /// @dev
    /// - Signature-validated via platform signer from `Factory`.
    /// - If a promoter is present, burns venue credits and mints promoter credits in USD units.
    /// - If `paymentInUSDC` is true: transfers USDC from customer to venue.
    /// - If false: applies subsidy minus processing fee via `Escrow`, then transfers discounted LONG from customer to venue.
    /// @param customerInfo Signed customer payment parameters (customer, venue, promoter, amount, flags, bounties).
    function payToVenue(CustomerInfo calldata customerInfo) external {
        BelongCheckInStorage memory _storage = belongCheckInStorage;
        VenueRules memory rules = generalVenueInfo[customerInfo.venueToPayFor].rules;

        _storage.contracts.factory.nftFactoryParameters().signerAddress.checkCustomerInfo(customerInfo, rules);

        uint256 venueId = customerInfo.venueToPayFor.getVenueId();

        if (customerInfo.promoter != address(0)) {
            uint256 rewardsToPromoter = customerInfo.paymentInUSDC
                ? customerInfo.visitBountyAmount + customerInfo.spendBountyPercentage.calculateRate(customerInfo.amount)
                : _storage.paymentsInfo.usdc.unstandardize(
                    // standardization
                    _storage.paymentsInfo.usdc.standardize(customerInfo.visitBountyAmount)
                        + customerInfo.spendBountyPercentage.calculateRate(
                            _storage.paymentsInfo.long.getStandardizedPrice(
                                _storage.contracts.longPF, customerInfo.amount, _storage.paymentsInfo.maxPriceFeedDelay
                            )
                        )
                );
            uint256 venueBalance = _storage.contracts.venueToken.balanceOf(customerInfo.venueToPayFor, venueId);
            require(venueBalance >= rewardsToPromoter, NotEnoughBalance(rewardsToPromoter, venueBalance));

            _storage.contracts.venueToken.burn(customerInfo.venueToPayFor, venueId, rewardsToPromoter);
            _storage.contracts.promoterToken.mint(
                customerInfo.promoter, venueId, rewardsToPromoter, _storage.contracts.venueToken.uri(venueId)
            );
        }

        if (customerInfo.paymentInUSDC) {
            _storage.paymentsInfo.usdc.safeTransferFrom(
                customerInfo.customer, customerInfo.venueToPayFor, customerInfo.amount
            );
        } else {
            // platform subsidy - processing fee
            uint256 subsidyMinusFees = _storage.fees.platformSubsidyPercentage.calculateRate(customerInfo.amount)
                - _storage.fees.processingFeePercentage.calculateRate(customerInfo.amount);
            _storage.contracts.escrow.distributeLONGDiscount(
                customerInfo.venueToPayFor, address(this), subsidyMinusFees
            );

            // customer paid amount - longCustomerDiscountPercentage (3%)
            uint256 longFromCustomer =
                customerInfo.amount - _storage.fees.longCustomerDiscountPercentage.calculateRate(customerInfo.amount);
            _storage.paymentsInfo.long.safeTransferFrom(customerInfo.customer, address(this), longFromCustomer);

            uint256 longAmount = subsidyMinusFees + longFromCustomer;

            if (rules.longPaymentType == LongPaymentTypes.AutoStake) {
                _storage.paymentsInfo.long.safeApprove(address(_storage.contracts.staking), longAmount);
                _storage.contracts.staking.deposit(longAmount, customerInfo.venueToPayFor);
            } else if (rules.longPaymentType == LongPaymentTypes.AutoConvert) {
                _swapLONGtoUSDC(customerInfo.venueToPayFor, longAmount);
            } else {
                _storage.paymentsInfo.long.safeTransfer(customerInfo.venueToPayFor, longAmount);
            }
        }

        emit CustomerPaid(
            customerInfo.customer,
            customerInfo.venueToPayFor,
            customerInfo.promoter,
            customerInfo.amount,
            customerInfo.visitBountyAmount,
            customerInfo.spendBountyPercentage
        );
    }

    /// @notice Settles promoter credits into a payout in either USDC or LONG.
    /// @dev
    /// - Signature-validated via platform signer from `Factory`.
    /// - Applies tiered platform fee based on `Staking` balance of the promoter.
    /// - For USDC payout: pulls from `Escrow` venue deposit to feeCollector and promoter.
    /// - For LONG payout: pulls USDC from `Escrow`, swaps to LONG (fee + promoter portions), and transfers out.
    /// - Burns promoter credits by the settled USD amount.
    /// @param promoterInfo Signed settlement parameters (promoter, venue, amountInUSD, payout currency flag).
    function distributePromoterPayments(PromoterInfo memory promoterInfo) external {
        BelongCheckInStorage memory _storage = belongCheckInStorage;

        _storage.contracts.factory.nftFactoryParameters().signerAddress.checkPromoterPaymentDistribution(promoterInfo);

        uint256 venueId = promoterInfo.venue.getVenueId();

        uint256 promoterBalance = _storage.contracts.promoterToken.balanceOf(promoterInfo.promoter, venueId);
        require(
            promoterBalance >= promoterInfo.amountInUSD, NotEnoughBalance(promoterInfo.amountInUSD, promoterBalance)
        );

        PromoterStakingRewardInfo memory stakingInfo = stakingRewards[_storage.contracts.staking.balanceOf(
            promoterInfo.promoter
        ).stakingTiers()].promoterStakingInfo;

        address feeCollector = _storage.contracts.factory.nftFactoryParameters().platformAddress;

        uint256 toPromoter = promoterInfo.amountInUSD;
        uint24 percentage = promoterInfo.paymentInUSDC ? stakingInfo.usdcPercentage : stakingInfo.longPercentage;
        uint256 plaformFees = percentage.calculateRate(toPromoter);
        unchecked {
            toPromoter -= plaformFees;
        }

        if (promoterInfo.paymentInUSDC) {
            _storage.contracts.escrow.distributeVenueDeposit(promoterInfo.venue, feeCollector, plaformFees);
            _storage.contracts.escrow.distributeVenueDeposit(promoterInfo.venue, promoterInfo.promoter, toPromoter);
        } else {
            _storage.contracts.escrow.distributeVenueDeposit(
                promoterInfo.venue, address(this), promoterInfo.amountInUSD
            );

            _swapUSDCtoLONG(feeCollector, plaformFees);
            _swapUSDCtoLONG(promoterInfo.promoter, toPromoter);
        }

        _storage.contracts.promoterToken.burn(promoterInfo.promoter, venueId, promoterInfo.amountInUSD);

        emit PromoterPaymentsDistributed(
            promoterInfo.promoter, promoterInfo.venue, promoterInfo.amountInUSD, promoterInfo.paymentInUSDC
        );
    }

    /// @notice Owner-only emergency function to cancel all promoter credits for a venue and restore them to the venue.
    /// @param venue The venue whose credits will be restored.
    /// @param promoter The promoter whose credits will be burned.
    function emergencyCancelPayment(address venue, address promoter) external onlyOwner {
        BelongCheckInStorage memory _storage = belongCheckInStorage;

        uint256 venueId = venue.getVenueId();
        uint256 promoterBalance = _storage.contracts.promoterToken.balanceOf(promoter, venueId);

        _storage.contracts.promoterToken.burn(promoter, venueId, promoterBalance);

        _storage.contracts.venueToken.mint(venue, venueId, promoterBalance, _storage.contracts.venueToken.uri(venueId));

        emit PromoterPaymentCancelled(venue, promoter, promoterBalance);
    }

    /// @notice Returns external contract references.
    /// @return contracts_ The `Contracts` struct currently in use.
    function contracts() external view returns (Contracts memory contracts_) {
        return belongCheckInStorage.contracts;
    }

    /// @notice Returns platform fee configuration.
    /// @return fees_ The `Fees` struct currently in use.
    function fees() external view returns (Fees memory fees_) {
        return belongCheckInStorage.fees;
    }

    /// @notice Returns Uniswap/asset configuration.
    /// @return paymentsInfo_ The `PaymentsInfo` struct currently in use.
    function paymentsInfo() external view returns (PaymentsInfo memory paymentsInfo_) {
        return belongCheckInStorage.paymentsInfo;
    }

    /// @notice Swaps exact USDC amount to LONG and sends proceeds to `recipient`.
    /// @dev
    /// - Builds a multi-hop path USDC → WETH → LONG using the same fee tier.
    /// - Uses Quoter to set a conservative `amountOutMinimum`.
    /// - Approves router for the exact USDC amount before calling.
    /// @param recipient The recipient of LONG. If zero or `amount` is zero, returns 0 without swapping.
    /// @param amount The USDC input amount to swap (USDC native decimals).
    /// @return swapped The amount of LONG received.
    function _swapUSDCtoLONG(address recipient, uint256 amount) internal returns (uint256 swapped) {
        if (recipient == address(0) || amount == 0) {
            return 0;
        }

        PaymentsInfo memory _paymentsInfo = belongCheckInStorage.paymentsInfo;

        bytes memory path;
        if (
            IUniswapV3Factory(_paymentsInfo.swapV3Factory).getPool(
                _paymentsInfo.usdc, _paymentsInfo.long, _paymentsInfo.swapPoolFees
            ) != address(0)
        ) {
            path = abi.encodePacked(_paymentsInfo.usdc, _paymentsInfo.swapPoolFees, _paymentsInfo.long);
        } else if (
            IUniswapV3Factory(_paymentsInfo.swapV3Factory).getPool(
                _paymentsInfo.usdc, _paymentsInfo.weth, _paymentsInfo.swapPoolFees
            ) != address(0)
        ) {
            path = abi.encodePacked(
                _paymentsInfo.usdc,
                _paymentsInfo.swapPoolFees,
                _paymentsInfo.weth,
                _paymentsInfo.swapPoolFees,
                _paymentsInfo.long
            );
        } else {
            revert NoValidSwapPath();
        }

        uint256 amountOutMinimum = IUniswapQuoter(_paymentsInfo.swapV3Quoter).quoteExactInput(path, amount).amountOutMin(
            _paymentsInfo.slippageBps
        );
        IUniswapRouter.ExactInputParams memory swapParams = IUniswapRouter.ExactInputParams({
            path: path,
            recipient: recipient,
            deadline: block.timestamp,
            amountIn: amount,
            amountOutMinimum: amountOutMinimum
        });

        _paymentsInfo.usdc.safeApprove(_paymentsInfo.swapV3Router, amount);
        swapped = IUniswapRouter(_paymentsInfo.swapV3Router).exactInput(swapParams);

        emit Swapped(recipient, amount, swapped);
    }

    /// @notice Swaps exact LONG amount to USDC and sends proceeds to `recipient`.
    /// @dev
    /// - Builds a multi-hop path LONG → WETH → USDC using the same fee tier.
    /// - Uses Quoter to set a conservative `amountOutMinimum`.
    /// - Approves router for the exact LONG amount before calling.
    /// @param recipient The recipient of USDC. If zero or `amount` is zero, returns 0 without swapping.
    /// @param amount The LONG input amount to swap (LONG native decimals).
    /// @return swapped The amount of USDC received.
    function _swapLONGtoUSDC(address recipient, uint256 amount) internal returns (uint256 swapped) {
        if (recipient == address(0) || amount == 0) {
            return 0;
        }

        PaymentsInfo memory _paymentsInfo = belongCheckInStorage.paymentsInfo;

        bytes memory path;
        if (
            IUniswapV3Factory(_paymentsInfo.swapV3Factory).getPool(
                _paymentsInfo.long, _paymentsInfo.usdc, _paymentsInfo.swapPoolFees
            ) != address(0)
        ) {
            path = abi.encodePacked(_paymentsInfo.long, _paymentsInfo.swapPoolFees, _paymentsInfo.usdc);
        } else if (
            IUniswapV3Factory(_paymentsInfo.swapV3Factory).getPool(
                _paymentsInfo.long, _paymentsInfo.weth, _paymentsInfo.swapPoolFees
            ) != address(0)
        ) {
            path = abi.encodePacked(
                _paymentsInfo.long,
                _paymentsInfo.swapPoolFees,
                _paymentsInfo.weth,
                _paymentsInfo.swapPoolFees,
                _paymentsInfo.usdc
            );
        } else {
            revert NoValidSwapPath();
        }

        uint256 amountOutMinimum = IUniswapQuoter(_paymentsInfo.swapV3Quoter).quoteExactInput(path, amount).amountOutMin(
            _paymentsInfo.slippageBps
        );
        IUniswapRouter.ExactInputParams memory swapParams = IUniswapRouter.ExactInputParams({
            path: path,
            recipient: recipient,
            deadline: block.timestamp,
            amountIn: amount,
            amountOutMinimum: amountOutMinimum
        });

        _paymentsInfo.long.safeApprove(_paymentsInfo.swapV3Router, amount);
        swapped = IUniswapRouter(_paymentsInfo.swapV3Router).exactInput(swapParams);

        emit Swapped(recipient, amount, swapped);
    }

    /// @notice Internal helper to atomically set global parameters and tier tables.
    /// @param _paymentsInfo New Uniswap/asset configuration.
    /// @param _fees New platform fee configuration.
    /// @param _stakingRewards Full 5-element tier table.
    function _setParameters(
        PaymentsInfo calldata _paymentsInfo,
        Fees memory _fees,
        RewardsInfo[5] memory _stakingRewards
    ) private {
        require(_paymentsInfo.slippageBps <= Helper.BPS, BPSTooHigh());

        belongCheckInStorage.paymentsInfo = _paymentsInfo;
        belongCheckInStorage.fees = _fees;

        for (uint8 i = 0; i < 5; ++i) {
            stakingRewards[StakingTiers(i)] = _stakingRewards[i];
        }

        emit ParametersSet(_paymentsInfo, _fees, _stakingRewards);
    }

    /// @notice Internal helper to set rules for a venue after validation.
    /// @dev Reverts if `rules.paymentType == PaymentTypes.NoType`.
    /// @param venue The venue address to update.
    /// @param rules The new rules to apply.
    function _setVenueRules(address venue, VenueRules memory rules) private {
        require(rules.paymentType != PaymentTypes.NoType, WrongPaymentTypeProvided());
        generalVenueInfo[venue].rules = rules;

        emit VenueRulesSet(venue, rules);
    }
}
