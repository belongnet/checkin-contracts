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
import {Helper} from "../utils/Helper.sol";

import {TimelockTiers, StakingTiers, VenueRules, VenueInfo, CustomerInfo} from "../Structures.sol";

/**
 * @title NFT Factory Contract
 * @notice A factory contract to create new NFT instances with specific parameters.
 * @dev This contract allows producing NFTs, managing platform settings, and verifying signatures.
 */
contract TapAndEarn is Initializable, Ownable {
    using SignatureVerifier for address;
    using MetadataReaderLib for address;
    using SafeTransferLib for address;
    using Helper for *;

    struct Contracts {
        Factory factory;
        Escrow escrow;
        Staking staking;
        CreditToken venueToken;
        CreditToken promoterToken;
        ILONGPriceFeed longPF;
    }

    struct Fees {
        uint8 referralCreditsAmount;
        uint24 affiliatePercentage;
        uint24 longCustomerDiscountPercentage;
        uint24 platformSubsidyPercentage;
        uint24 processingFeePercentage;
    }

    struct PaymentsInfo {
        uint24 uniswapPoolFees;
        address uniswapV3Router;
        address uniswapV3Quoter;
        address weth;
        address usdc;
        address long;
    }

    struct GeneralVenueInfo {
        VenueRules rules;
        uint16 remainingCredits;
        // mapping(address promoter => uint256[] paymentTimes) venuePromoterPaymentTime;
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

    // ========== Errors ==========

    error WrongReferralCode(bytes32 referralCode);
    error CanNotClaim(address venue, address promoter);
    error PaymentInTimelock(address venue, address promoter, uint256 amount);
    error OnlyCorrectVenue(uint256 venueId, address venue);
    error NotEnoughBalance(uint256 rewardsToPromoter);

    // ========== Events ==========
    event ParametersUpdated(
        Contracts contracts,
        PaymentsInfo paymentsInfo,
        Fees fees,
        uint24[5] timelocks,
        RewardsInfo[5] rewards
    );
    event VenuePaidDeposit(
        address indexed venue,
        uint256 amount,
        bytes32 referralCode
    );

    event VenueRulesUpdated(address indexed venue, VenueRules rules);

    // ========== State Variables ==========

    Contracts public contracts;

    PaymentsInfo public paymentsInfo;

    Fees public fees;

    mapping(address venue => GeneralVenueInfo info) public generalVenueInfo;

    mapping(TimelockTiers tier => uint24 timelock) public timelocks;
    mapping(StakingTiers tier => RewardsInfo rewardInfo) public stakingRewards;

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

        uint24[5] _timelocks = [0, 1 hours, 6 hours, 24 hours, 48 hours];
        _setParameters(
            _contracts,
            _paymentsInfo,
            Fees({
                referralCreditsAmount: 3,
                affiliatePercentage: 1000, // 10%
                longCustomerDiscountPercentage: 300, // 3%
                platformSubsidyPercentage: 300, // 3%
                processingFeePercentage: 250 // 3%
            }),
            _timelocks,
            stakingRewardsInfo
        );

        _initializeOwner(_owner);
    }

    function setParameters(
        Contracts calldata _contracts,
        PaymentsInfo calldata _paymentsInfo,
        Fees calldata _fees,
        uint24[5] memory _timelocks,
        RewardsInfo[5] memory _stakingRewards
    ) external onlyOwner {
        _setParameters(
            _contracts,
            _paymentsInfo,
            _fees,
            _timelocks,
            _stakingRewards
        );
    }

    function updateVenueRules(VenueRules calldata rules) external {
        uint256 venueId = msg.sender.getVenueId();
        uint256 venueBalance = contracts.venueToken.balanceOf(
            msg.sender,
            venueId
        );
        require(venueBalance > 0, OnlyCorrectVenue(venueId, msg.sender));
        _setVenueRules(msg.sender, rules);
    }

    // Approve should be: venueInfo.amount + depositFeePercentage + convenienceFee + affiliateFee
    function venueDeposit(VenueInfo calldata venueInfo) external {
        Contracts memory _contracts = contracts;

        _contracts.factory.nftFactoryParameters().signer.checkVenueInfo(
            venueInfo
        );

        VenueStakingRewardInfo memory stakingInfo = stakingRewards[
            _contracts.staking.balanceOf(venueInfo.venue).stakingTiers()
        ].venueStakingInfo;

        address affiliate;
        uint256 affiliateFee;
        if (venueInfo.referralCode != bytes32(0)) {
            affiliate = _contracts.factory.getReferralCreator(
                venueInfo.referralCode
            );
            require(
                affiliate != address(0),
                WrongReferralCode(venueInfo.referralCode)
            );

            affiliateFee = fees.affiliatePercentage.calculateRate(
                venueInfo.amount
            );
        }

        address feeCollector = _contracts
            .factory
            .nftFactoryParameters()
            .feeCollector;
        address usdc = paymentsInfo.usdc;
        uint256 venueId = venueInfo.venue.getVenueId();

        if (
            generalVenueInfo[venueInfo.venue].remainingCredits <
            fees.referralCreditsAmount
        ) {
            unchecked {
                ++generalVenueInfo[venueInfo.venue].remainingCredits;
            }
        } else {
            usdc.safeTransferFrom(
                venueInfo.venue,
                feeCollector,
                stakingInfo.depositFeePercentage.calculateRate(venueInfo.amount)
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

        uint256 convenienceFeeLong = _swap(
            address(_contracts.escrow),
            stakingInfo.convenienceFee
        );
        _swap(affiliate, affiliateFee);

        _contracts.escrow.venueDeposit(
            venueInfo.venue,
            venueInfo.amount,
            convenienceFeeLong
        );

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

    function payToVenue(CustomerInfo calldata customerInfo) external {
        Contracts memory _contracts = contracts;
        VenueRules memory rules = generalVenueInfo[customerInfo.venueToPayFor]
            .rules;

        _contracts.factory.nftFactoryParameters().signer.checkCustomerInfo(
            customerInfo,
            rules
        );

        uint256 venueId = customerInfo.venueToPayFor.getVenueId();

        PaymentsInfo memory _paymentsInfo = paymentsInfo;

        uint256 rewardsToPromoter = customerInfo.paymentInUsdc
            ? rules.visitBountyAmount +
                rules.spendBountyPercentage.calculateRate(customerInfo.amount)
            : _paymentsInfo.usdc.destandardize(
                // standardization
                _paymentsInfo.usdc.standardize(rules.visitBountyAmount) +
                    rules.spendBountyPercentage.calculateRate(
                        _paymentsInfo.long.getStandardizedPrice(
                            _contracts.pf,
                            customerInfo.amount
                        )
                    )
            );

        require(
            contracts.venueToken.balanceOf(
                customerInfo.venueToPayFor,
                venueId
            ) >= rewardsToPromoter,
            NotEnoughBalance(rewardsToPromoter)
        );

        // venuePromoterPaymentTime[customerInfo.venueToPayFor][
        //     customerInfo.promoter
        // ].push(block.timestamp);

        if (customerInfo.paymentInUsdc) {
            _paymentsInfo.usdc.safeTransferFrom(
                customerInfo.customer,
                customerInfo.venueToPayFor,
                customerInfo.amount
            );
        } else {
            // platform subsidy - processing fee
            _contracts.escrow.distributeLONGDiscount(
                venueId,
                fees.platformSubsidyPercentage.calculateRate(
                    customerInfo.amount
                ) -
                    fees.processingFeePercentage.calculateRate(
                        customerInfo.amount
                    )
            );

            // customer paid amount - 3%
            _paymentsInfo.long.safeTransferFrom(
                customerInfo.customer,
                customerInfo.venueToPayFor,
                customerInfo.amount -
                    fees.longCustomerDiscountPercentage.calculateRate(
                        customerInfo.amount
                    )
            );
        }

        _contracts.venueToken.burn(
            customerInfo.venueToPayFor,
            venueId,
            rewardsToPromoter
        );

        _contracts.promoterToken.mint(
            customerInfo.promoter,
            venueId,
            rewardsToPromoter
        );
    }

    function getPromoterPayments(address venue, bool paymentInUsdc) external {
        uint256 venueId = venue.getVenueId();
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

        PromoterStakingRewardInfo memory stakingInfo = stakingRewards[
            _contracts.staking.balanceOf(msg.sender).stakingTiers()
        ].promoterStakingInfo;

        address feeCollector = _contracts
            .factory
            .nftFactoryParameters()
            .feeCollector;

        uint256 toPromoter = promoterBalance;
        uint256 plaformFees = paymentInUsdc
            ? stakingInfo.usdcPercentage
            : stakingInfo.longPercentage.calculateRate(promoterBalance);
        unchecked {
            toPromoter -= plaformFees;
        }

        if (paymentInUsdc) {
            _contracts.escrow.distributeVenueDeposit(
                venue,
                feeCollector,
                plaformFees
            );
            _contracts.escrow.distributeVenueDeposit(
                venue,
                msg.sender,
                toPromoter
            );
        } else {
            _contracts.escrow.distributeVenueDeposit(
                venue,
                address(this),
                promoterBalance
            );

            _swap(feeCollector, plaformFees);
            _swap(msg.sender, toPromoter);
        }

        _contracts.promoterToken.burn(msg.sender, venueId, promoterBalance);
    }

    function emergencyCancelPayment(
        address venue,
        address promoter
    ) external onlyOwner {
        Contracts memory _contracts = contracts;
        uint256 venueId = venue.getVenueId();
        uint256 promoterBalance = _contracts.promoterToken.balanceOf(
            promoter,
            venueId
        );
        // require(
        //     block.timestamp <
        //         venuePromoterPaymentTime[venue][promoter] +
        //             depositTimelocks(promoterBalance),
        //     PaymentInTimelock(venue, promoter, promoterBalance)
        // );

        _contracts.promoterToken.burn(promoter, venueId, promoterBalance);

        _contracts.venueToken.mint(
            venue,
            venueId,
            promoterBalance,
            _contracts.venueToken.uri(venueId)
        );
    }

    function _swap(
        address recipient,
        uint256 amount
    ) internal returns (uint256 swapped) {
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
        swapped = ISwapRouter(_paymentsInfo.uniswapV3Router).exactInput(
            swapParams
        );
    }

    function _setParameters(
        Contracts calldata _contracts,
        PaymentsInfo calldata _paymentsInfo,
        Fees calldata _fees,
        uint24[5] memory _timelocks,
        RewardsInfo[5] memory _stakingRewards
    ) private {
        contracts = _contracts;

        paymentsInfo = _paymentsInfo;

        fees = _fees;

        for (uint8 i = 0; i < 5; ++i) {
            stakingRewards[StakingTiers(i)] = _stakingRewards[i];
            timelocks[TimelockTiers(i)] = _timelocks[i];
        }

        emit ParametersUpdated(
            _contracts,
            _paymentsInfo,
            _fees,
            _timelocks,
            _stakingRewards
        );
    }

    function _setVenueRules(address venue, VenueRules calldata rules) private {
        generalVenueInfo[venue].rules = rules;

        emit VenueRulesUpdated(venue, rules);
    }
}
