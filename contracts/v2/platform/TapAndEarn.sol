// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {MetadataReaderLib} from "solady/src/utils/MetadataReaderLib.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IQuoter} from "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";

import {Factory} from "./Factory.sol";
import {Escrow} from "../periphery/Escrow.sol";
import {Staking} from "../periphery/Staking.sol";
import {CreditToken} from "../tokens/CreditToken.sol";
import {SignatureVerifier} from "../utils/SignatureVerifier.sol";
import {VenueRules, VenueInfo, CustomerInfo} from "../Structures.sol";

/**
 * @title NFT Factory Contract
 * @notice A factory contract to create new NFT instances with specific parameters.
 * @dev This contract allows producing NFTs, managing platform settings, and verifying signatures.
 */
contract TapAndEarn is Initializable, Ownable {
    using SignatureVerifier for address;
    using MetadataReaderLib for address;
    using SafeTransferLib for address;

    struct Contracts {
        Factory factory;
        Escrow escrow;
        Staking staking;
        CreditToken venueToken;
        CreditToken promoterToken;
    }

    struct VenueStakingRewardInfo {
        uint24 depositFeePercentage;
        uint24 convenienceFeeAmount;
    }

    struct PromoterStakingRewardInfo {
        uint24 usdcPercentage;
        uint24 longPercentage;
    }

    struct RewardsInfo {
        VenueStakingRewardInfo venueStakingInfo;
        PromoterStakingRewardInfo promoterStakingInfo;
    }

    struct VenueStakingRewards {
        VenueStakingRewardInfo noStakes;
        VenueStakingRewardInfo bronzeTier;
        VenueStakingRewardInfo silverTier;
        VenueStakingRewardInfo goldTier;
        VenueStakingRewardInfo platinumTier;
    }

    struct PromoterStakingRewards {
        PromoterStakingRewardInfo noStakes;
        PromoterStakingRewardInfo bronzeTier;
        PromoterStakingRewardInfo silverTier;
        PromoterStakingRewardInfo goldTier;
        PromoterStakingRewardInfo platinumTier;
    }

    struct DepositTimelocks {
        uint24 timelock1;
        uint24 timelock2;
        uint24 timelock3;
        uint24 timelock4;
        uint24 timelock5;
    }

    struct PaymentsInfo {
        uint24 uniswapPoolFees;
        address uniswapV3Router;
        address uniswapV3Quoter;
        address weth;
        address usdc;
        address long;
    }

    enum StakingTiers {
        NoStakes,
        BronzeTier,
        SilverTier,
        GoldTier,
        PlatinumTier
    }

    // ========== Errors ==========

    error WrongReferralCode(bytes32 referralCode);
    error CanNotClaim(address venue, address promoter);
    error PaymentInTimelock(address venue, address promoter, uint256 amount);
    error OnlyCorrectVenue(uint256 venueId, address venue);

    // ========== Events ==========
    event ParametersUpdated(
        Tokens tokens,
        PaymentsInfo paymentsInfo,
        DepositTimelocks depositTimelocks,
        uint256 affiliatePercentage,
        uint256 referralCreditsAmount
    );
    event VenuePaidDeposit(
        address indexed venue,
        uint256 amount,
        bytes32 referralCode
    );

    event VenueRulesUpdated(
        address indexed venue,
        PaymentTypes paymentTypes,
        RewardTypes rewardTypes
    );

    event TiersUpdated(
        PromoterStakingRewards promoterRewards,
        VenueStakingRewards venueRewards
    );

    // ========== State Variables ==========

    /// @notice The scaling factor for referral percentages.
    uint16 public constant SCALING_FACTOR = 10000;

    Contracts public contracts;

    PaymentsInfo public paymentsInfo;

    DepositTimelocks private _depositTimelocks;

    uint8 public referralCreditsAmount;
    uint24 public affiliatePercentage;

    mapping(StakingTiers tier => RewardsInfo rewardInfo) public rewards;

    struct VenueInfo {
        VenueRules rules;
        uint16 remainingCredits;
        // mapping(address promoter => uint256[] paymentTimes) venuePromoterPaymentTime;
    }

    mapping(address venue => VenueInfo info) public venuesInfo;

    // ========== Functions ==========

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with NFT factory parameters and referral percentages.
     */
    function initialize(
        address _owner,
        Contracts calldata _contracts,
        PaymentsInfo calldata _paymentsInfo
    ) external initializer {
        uint256 convenienceFeeAmount = 5 *
            10 ** _paymentsInfo.usdc.readDecimals(); // 5 USDC

        _setTiers(
            PromoterStakingTiers({
                noStakes: PromoterStakingRewardInfo({
                    usdcPercentage: 1000, //10%
                    longPercentage: 800 // 8%
                }),
                bronzeTier: PromoterStakingRewardInfo({
                    usdcPercentage: 1000, //10%
                    longPercentage: 700 // 7%
                }),
                silverTier: PromoterStakingRewardInfo({
                    usdcPercentage: 1000, //10%
                    longPercentage: 600 // 6%
                }),
                goldTier: PromoterStakingRewardInfo({
                    usdcPercentage: 1000, //10%
                    longPercentage: 500 // 5%
                }),
                platinumTier: PromoterStakingRewardInfo({
                    usdcPercentage: 1000, //10%
                    longPercentage: 400 // 4%
                })
            }),
            VenueStakingTiers({
                noStakes: VenueStakingRewardInfo({
                    depositFeePercentage: 1000, //10%
                    convenienceFeeAmount: convenienceFeeAmount // $5
                }),
                bronzeTier: VenueStakingRewardInfo({
                    depositFeePercentage: 900, // 9%
                    convenienceFeeAmount: convenienceFeeAmount // $5
                }),
                silverTier: VenueStakingRewardInfo({
                    depositFeePercentage: 800, // 8%
                    convenienceFeeAmount: convenienceFeeAmount // $5
                }),
                goldTier: VenueStakingRewardInfo({
                    depositFeePercentage: 700, // 7%
                    convenienceFeeAmount: convenienceFeeAmount // $5
                }),
                platinumTier: VenueStakingRewardInfo({
                    depositFeePercentage: 500, // 5%
                    convenienceFeeAmount: convenienceFeeAmount // $5
                })
            })
        );

        _setParameters(
            _contracts,
            _paymentsInfo,
            DepositTimelocks({
                timelock1: 0, // 0 seconds
                timelock2: 1 hours, // 1 hour
                timelock3: 6 hours, // 6 hours
                timelock4: 24 hours, // 24 hours
                timelock5: 48 hours // 48 hours
            }),
            1000,
            3
        );

        _initializeOwner(_owner);
    }

    function setParameters(
        Contracts calldata _contracts,
        PaymentsInfo calldata _paymentsInfo,
        DepositTimelocks memory _depositTimes,
        uint256 _affiliatePercentage,
        uint256 _credits
    ) external onlyOwner {
        _setParameters(
            _contracts,
            _paymentsInfo,
            _depositTimes,
            _affiliatePercentage,
            _credits
        );
    }

    // Approve should be: venueInfo.amount + depositFeePercentage + convenienceFee + affiliateFee
    function venueDeposit(VenueInfo calldata venueInfo) external {
        _factory.nftFactoryParameters().signer.checkVenueInfo(venueInfo);

        Contracts memory _contracts = contracts;
        VenueStakingRewardInfo memory stakingInfo = rewards[
            stakingTiers(_contracts.staking.balanceOf(venueInfo.venue))
        ].venueStakingInfo;

        address affiliate;
        uint256 affiliateFee;
        if (venueInfo.referralCode != bytes32(0)) {
            affiliate = _factory.getReferralCreator(venueInfo.referralCode);
            require(
                affiliate != address(0),
                WrongReferralCode(venueInfo.referralCode)
            );

            affiliateFee = calculateRate(venueInfo.amount, affiliatePercentage);
        }

        address feeCollector = _contracts
            .factory
            .nftFactoryParameters()
            .feeCollector;
        address usdc = paymentsInfo.usdc;
        uint256 venueId = getVenueId(venueInfo.venue);

        if (
            venuesInfo[venueInfo.venue].remainingCredits < referralCreditsAmount
        ) {
            unchecked {
                ++venuesInfo[venueInfo.venue].remainingCredits;
            }
        } else {
            usdc.safeTransferFrom(
                venueInfo.venue,
                feeCollector,
                calculateRate(
                    venueInfo.amount,
                    stakingInfo.depositFeePercentage
                )
            );
        }

        _setVenueRules(venueInfo.venue, venueInfo.rules);

        usdc.safeTransferFrom(
            venueInfo.venue,
            address(this),
            stakingInfo.convenienceFee + affiliateFee
        );
        usdc.safeTransferFrom(
            venueInfo.venue,
            address(_contracts.escrow),
            venueInfo.amount
        );

        _swap(feeCollector, stakingInfo.convenienceFee);
        _swap(affiliate, affiliateFee);

        _contracts.escrow.saveVenueDeposit(venueId, venueInfo.amount);

        _contracts.venueToken.mint(
            venueInfo.venue,
            venueId,
            venueInfo.amount,
            venueInfo.uri
        );

        emit VenuePaidDeposit(
            venueInfo.venue,
            venueInfo.amount,
            venueInfo.referralCode
        );
    }

    function updateVenueRules(VenueRules calldata rules) external {
        uint256 venueId = getVenueId(msg.sender);
        uint256 venueBalance = tokens.venueToken.balanceOf(msg.sender, venueId);
        require(venueBalance > 0, OnlyCorrectVenue(venueId, msg.sender));
        _setVenueRules(msg.sender, rules);
    }

    function payToVenue(CustomerInfo calldata customerInfo) external {
        Contracts memory _contracts = contracts;
        VenueRules memory rules = venuesInfo[customerInfo.venueToPayFor].rules;

        _contracts.factory.nftFactoryParameters().signer.checkCustomerInfo(
            customerInfo,
            rules
        );

        uint256 venueId = getVenueId(customerInfo.venueToPayFor);

        if (customerInfo.paymentInUsdc) {
            //TODO: assume that payment only in USDC now
            uint256 rewardsToPromoter = rules.visitBountyAmount +
                calculateRate(customerInfo.amount, rules.spendBountyPercentage);
            uint256 venueBalance = _contracts.venueToken.balanceOf(
                customerInfo.venueToPayFor,
                venueId
            );
            require(
                venueBalance >= rewardsToPromoter,
                NotEnoughBalance(venueBalance, rewardsToPromoter)
            );

            // venuePromoterPaymentTime[customerInfo.venueToPayFor][
            //     customerInfo.promoter
            // ].push(block.timestamp);

            paymentsInfo.usdc.safeTransferFrom(
                customerInfo.customer,
                customerInfo.venueToPayFor,
                customerInfo.amount
            );

            _contracts.venueToken.burn(
                customerInfo.venueToPayFor,
                venueId,
                rewardsToPromoter
            );

            _contracts.promoterToken.mint(
                customerInfo.promoter,
                venueId,
                rewardsToPromoter,
                _tokens.venueToken.uri(venueId)
            );
        } else {}
    }

    function getPromoterPayments(address venue, bool paymentInUsdc) external {
        uint256 venueId = getVenueId(venue);
        Contracts memory _contracts = contracts;

        uint256 promoterBalance = _contracts.promoterToken.balanceOf(
            msg.sender,
            venueId
        );
        require(promoterBalance > 0, CanNotClaim(venue, msg.sender));

        // uint256[] memory times = venuePromoterPaymentTime[venue][msg.sender];
        // for (uint256 i = 0; i < times.length; ++i) {
        //     require(
        //         block.timestamp >= times + depositTimelocks(promoterBalance),
        //         PaymentInTimelock(venue, msg.sender, promoterBalance)
        //     );
        // }

        PromoterStakingRewardInfo memory stakingInfo = rewards[
            stakingTiers(_contracts.staking.balanceOf(msg.sender))
        ].promoterStakingInfo;

        address feeCollector = _contracts
            .factory
            .nftFactoryParameters()
            .feeCollector;

        uint256 toPromoter = promoterBalance;
        uint256 fees = calculateRate(
            promoterBalance,
            paymentInUsdc
                ? stakingInfo.usdcPercentage
                : stakingInfo.longPercentage
        );
        unchecked {
            toPromoter -= fees;
        }

        if (paymentInUsdc) {
            address usdc = paymentsInfo.usdc;

            _contracts.escrow.distributeVenueDeposit(
                venueId,
                feeCollector,
                fees
            );
            _contracts.escrow.distributeVenueDeposit(
                venueId,
                msg.sender,
                toPromoter
            );
        } else {
            _contracts.escrow.distributeVenueDeposit(
                venueId,
                address(this),
                promoterBalance
            );

            _swap(feeCollector, fees);
            _swap(msg.sender, toPromoter);
        }

        _contracts.promoterToken.burn(msg.sender, venueId, promoterBalance);
    }

    function emergencyCancelPayment(
        address venue,
        address promoter
    ) external onlyOwner {
        Contracts memory _contracts = contracts;
        uint256 venueId = getVenueId(venue);
        uint256 promoterBalance = _contracts.promoterToken.balanceOf(
            promoter,
            venueId
        );
        require(
            block.timestamp <
                venuePromoterPaymentTime[venue][promoter] +
                    depositTimelocks(promoterBalance),
            PaymentInTimelock(venue, promoter, promoterBalance)
        );

        _contracts.promoterToken.burn(promoter, venueId, promoterBalance);

        _contracts.venueToken.mint(
            venue,
            venueId,
            promoterBalance,
            _contracts.venueToken.uri(venueId)
        );
    }

    function stakingTiers(
        uint256 amountStaked
    ) public view returns (StakingTiers tier) {
        if (amountStaked < 50000) {
            return StakingTiers.NoStakes;
        } else if (amountStaked >= 50000 && amountStaked < 250000) {
            return StakingTiers.BronzeTier;
        } else if (amountStaked >= 250000 && amountStaked < 500000) {
            return StakingTiers.SilverTier;
        } else if (amountStaked >= 500000 && amountStaked < 1000000) {
            return StakingTiers.GoldTier;
        }
        return StakingTiers.PlatinumTier;
    }

    function depositTimelocks(
        uint256 amount
    ) public view returns (uint256 time) {
        if (amount <= 100) {
            time = _depositTimelocks.timelock1;
        } else if (amount > 100 && amount <= 500) {
            time = _depositTimelocks.timelock2;
        } else if (amount > 500 && amount <= 1000) {
            time = _depositTimelocks.timelock3;
        } else if (amount > 1000 && amount <= 5000) {
            time = _depositTimelocks.timelock4;
        }
        time = _depositTimelocks.timelock5;
    }

    function calculateRate(
        uint256 amount,
        uint256 percentage
    ) public pure returns (uint256 rate) {
        rate = (amount * percentage) / SCALING_FACTOR;
    }

    function getVenueId(address venue) public pure returns (uint256) {
        return uint256(uint160(venue));
    }

    function _swap(address recipient, uint256 amount) internal {
        if (recipient == address(0) || amount == 0) {
            return;
        }

        PaymentsInfo memory _paymentsInfo = paymentsInfo;

        bytes memory path = abi.encodePacked(
            _paymentsInfo.usdc,
            _paymentsInfo.uniswapPoolFees,
            _paymentsInfo.weth,
            _paymentsInfo.uniswapPoolFees,
            _paymentsInfo.long
        );
        uint256 amountOutMinimum = IQuoter(_paymentsInfo.uniswapV3Quoter)
            .quoteExactInput(path, amount);
        ISwapRouter.ExactInputParams memory swapParams = ISwapRouter
            .ExactInputParams({
                path: path,
                recipient: recipient,
                deadline: block.timestamp,
                amountIn: amount,
                amountOutMinimum: amountOutMinimum
            });

        SafeTransferLib.safeApprove(
            _paymentsInfo.usdc,
            _paymentsInfo.uniswapV3Router,
            amount
        );
        ISwapRouter(_paymentsInfo.uniswapV3Router).exactInput(swapParams);
    }

    function _setParameters(
        Contracts calldata _contracts,
        PaymentsInfo calldata _paymentsInfo,
        DepositTimelocks memory _depositTimes,
        uint256 _affiliatePercentage,
        uint256 _referralCreditsAmount
    ) private {
        contracts = _contracts;

        paymentsInfo = _paymentsInfo;
        _depositTimelocks = _depositTimes;
        affiliatePercentage = _affiliatePercentage;
        referralCreditsAmount = _referralCreditsAmount;

        emit ParametersUpdated(
            _tokens,
            _paymentsInfo,
            _depositTimes,
            _affiliatePercentage,
            _referralCreditsAmount
        );
    }

    function _setTiers(
        PromoterStakingRewards memory _promoterRewards,
        VenueStakingRewards memory _venueRewards
    ) private {
        promoterRewards[StakingTiers.NoStakes] = _promoterRewards.noStakes;
        promoterRewards[StakingTiers.BronzeTier] = _promoterRewards.bronzeTier;
        promoterRewards[StakingTiers.SilverTier] = _promoterRewards.silverTier;
        promoterRewards[StakingTiers.GoldTier] = _promoterRewards.goldTier;
        promoterRewards[StakingTiers.PlatinumTier] = _promoterRewards
            .platinumTier;

        venueRewards[StakingTiers.NoStakes] = _venueRewards.noStakes;
        venueRewards[StakingTiers.BronzeTier] = _venueRewards.bronzeTier;
        venueRewards[StakingTiers.SilverTier] = _venueRewards.silverTier;
        venueRewards[StakingTiers.GoldTier] = _venueRewards.goldTier;
        venueRewards[StakingTiers.PlatinumTier] = _venueRewards.platinumTier;

        emit TiersUpdated(_promoterRewards, _venueRewards);
    }

    function _setVenueRules(address venue, VenueRules calldata rules) private {
        venuesInfo[venueInfo.venue].rules = rules;

        emit VenueRulesUpdated(venue, rules.paymentTypes, rules.rewardTypes);
    }
}
