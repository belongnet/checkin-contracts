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
import {ILONGPriceFeed} from "../interfaces/ILONGPriceFeed.sol";
import {SignatureVerifier} from "../utils/SignatureVerifier.sol";
import {Helper} from "../utils/Helper.sol";

import {StakingTiers, VenueRules, VenueInfo, CustomerInfo} from "../Structures.sol";

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

    struct Storage {
        Contracts contracts;
        PaymentsInfo paymentsInfo;
        Fees fees;
    }

    struct Contracts {
        Factory factory;
        Escrow escrow;
        Staking staking;
        CreditToken venueToken;
        CreditToken promoterToken;
        address longPF;
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
    error OnlyCorrectVenue(uint256 venueId, address venue);
    error NotEnoughBalance(uint256 rewardsToPromoter);

    // ========== Events ==========
    event ParametersUpdated(
        Contracts contracts,
        PaymentsInfo paymentsInfo,
        Fees fees,
        RewardsInfo[5] rewards
    );
    event VenuePaidDeposit(
        address indexed venue,
        uint256 amount,
        bytes32 referralCode
    );

    event VenueRulesUpdated(address indexed venue, VenueRules rules);

    // ========== State Variables ==========

    Storage public tapEarnStorage;

    mapping(address venue => GeneralVenueInfo info) public generalVenueInfo;

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
        uint24 convenienceFeeAmount = uint24(
            5 * 10 ** _paymentsInfo.usdc.readDecimals()
        ); // 5 USDC
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
            _contracts,
            _paymentsInfo,
            Fees({
                referralCreditsAmount: 3,
                affiliatePercentage: 1000, // 10%
                longCustomerDiscountPercentage: 300, // 3%
                platformSubsidyPercentage: 300, // 3%
                processingFeePercentage: 250 // 3%
            }),
            stakingRewardsInfo
        );

        _initializeOwner(_owner);
    }

    function setParameters(
        Contracts calldata _contracts,
        PaymentsInfo calldata _paymentsInfo,
        Fees calldata _fees,
        RewardsInfo[5] memory _stakingRewards
    ) external onlyOwner {
        _setParameters(_contracts, _paymentsInfo, _fees, _stakingRewards);
    }

    function updateVenueRules(VenueRules calldata rules) external {
        uint256 venueId = msg.sender.getVenueId();
        uint256 venueBalance = tapEarnStorage.contracts.venueToken.balanceOf(
            msg.sender,
            venueId
        );
        require(venueBalance > 0, OnlyCorrectVenue(venueId, msg.sender));
        _setVenueRules(msg.sender, rules);
    }

    // Approve should be: venueInfo.amount + depositFeePercentage + convenienceFee + affiliateFee
    function venueDeposit(VenueInfo calldata venueInfo) external {
        Storage memory _storage = tapEarnStorage;

        _storage.contracts.factory.nftFactoryParameters().signer.checkVenueInfo(
            venueInfo
        );

        VenueStakingRewardInfo memory stakingInfo = stakingRewards[
            _storage.contracts.staking.balanceOf(venueInfo.venue).stakingTiers()
        ].venueStakingInfo;

        address affiliate;
        uint256 affiliateFee;
        if (venueInfo.referralCode != bytes32(0)) {
            affiliate = _storage.contracts.factory.getReferralCreator(
                venueInfo.referralCode
            );
            require(
                affiliate != address(0),
                WrongReferralCode(venueInfo.referralCode)
            );

            affiliateFee = _storage.fees.affiliatePercentage.calculateRate(
                venueInfo.amount
            );
        }

        address feeCollector = _storage
            .contracts
            .factory
            .nftFactoryParameters()
            .feeCollector;
        uint256 venueId = venueInfo.venue.getVenueId();

        if (
            generalVenueInfo[venueInfo.venue].remainingCredits <
            _storage.fees.referralCreditsAmount
        ) {
            unchecked {
                ++generalVenueInfo[venueInfo.venue].remainingCredits;
            }
        } else {
            _storage.paymentsInfo.usdc.safeTransferFrom(
                venueInfo.venue,
                feeCollector,
                stakingInfo.depositFeePercentage.calculateRate(venueInfo.amount)
            );
        }

        _setVenueRules(venueInfo.venue, venueInfo.rules);

        _storage.paymentsInfo.usdc.safeTransferFrom(
            venueInfo.venue,
            address(this),
            stakingInfo.convenienceFeeAmount + affiliateFee
        );
        _storage.paymentsInfo.usdc.safeTransferFrom(
            venueInfo.venue,
            address(_storage.contracts.escrow),
            venueInfo.amount
        );

        uint256 convenienceFeeLong = _swap(
            address(_storage.contracts.escrow),
            stakingInfo.convenienceFeeAmount
        );
        _swap(affiliate, affiliateFee);

        _storage.contracts.escrow.venueDeposit(
            venueInfo.venue,
            venueInfo.amount,
            convenienceFeeLong
        );

        _storage.contracts.venueToken.mint(
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
        Storage memory _storage = tapEarnStorage;
        VenueRules memory rules = generalVenueInfo[customerInfo.venueToPayFor]
            .rules;

        _storage
            .contracts
            .factory
            .nftFactoryParameters()
            .signer
            .checkCustomerInfo(customerInfo, rules);

        uint256 venueId = customerInfo.venueToPayFor.getVenueId();

        uint256 rewardsToPromoter = customerInfo.paymentInUsdc
            ? customerInfo.visitBountyAmount +
                customerInfo.spendBountyPercentage.calculateRate(
                    customerInfo.amount
                )
            : _storage.paymentsInfo.usdc.unstandardize(
                // standardization
                _storage.paymentsInfo.usdc.standardize(
                    customerInfo.visitBountyAmount
                ) +
                    customerInfo.spendBountyPercentage.calculateRate(
                        _storage.paymentsInfo.long.getStandardizedPrice(
                            _storage.contracts.longPF,
                            customerInfo.amount
                        )
                    )
            );

        require(
            _storage.contracts.venueToken.balanceOf(
                customerInfo.venueToPayFor,
                venueId
            ) >= rewardsToPromoter,
            NotEnoughBalance(rewardsToPromoter)
        );

        if (customerInfo.paymentInUsdc) {
            _storage.paymentsInfo.usdc.safeTransferFrom(
                customerInfo.customer,
                customerInfo.venueToPayFor,
                customerInfo.amount
            );
        } else {
            // platform subsidy - processing fee
            _storage.contracts.escrow.distributeLONGDiscount(
                customerInfo.venueToPayFor,
                _storage.fees.platformSubsidyPercentage.calculateRate(
                    customerInfo.amount
                ) -
                    _storage.fees.processingFeePercentage.calculateRate(
                        customerInfo.amount
                    )
            );

            // customer paid amount - 3%
            _storage.paymentsInfo.long.safeTransferFrom(
                customerInfo.customer,
                customerInfo.venueToPayFor,
                customerInfo.amount -
                    _storage.fees.longCustomerDiscountPercentage.calculateRate(
                        customerInfo.amount
                    )
            );
        }

        _storage.contracts.venueToken.burn(
            customerInfo.venueToPayFor,
            venueId,
            rewardsToPromoter
        );

        _storage.contracts.promoterToken.mint(
            customerInfo.promoter,
            venueId,
            rewardsToPromoter,
            _storage.contracts.venueToken.uri(venueId)
        );
    }

    function getPromoterPayments(address venue, bool paymentInUsdc) external {
        Storage memory _storage = tapEarnStorage;

        uint256 venueId = venue.getVenueId();

        uint256 promoterBalance = _storage.contracts.promoterToken.balanceOf(
            msg.sender,
            venueId
        );
        require(promoterBalance > 0, CanNotClaim(venue, msg.sender));

        PromoterStakingRewardInfo memory stakingInfo = stakingRewards[
            _storage.contracts.staking.balanceOf(msg.sender).stakingTiers()
        ].promoterStakingInfo;

        address feeCollector = _storage
            .contracts
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
            _storage.contracts.escrow.distributeVenueDeposit(
                venue,
                feeCollector,
                plaformFees
            );
            _storage.contracts.escrow.distributeVenueDeposit(
                venue,
                msg.sender,
                toPromoter
            );
        } else {
            _storage.contracts.escrow.distributeVenueDeposit(
                venue,
                address(this),
                promoterBalance
            );

            _swap(feeCollector, plaformFees);
            _swap(msg.sender, toPromoter);
        }

        _storage.contracts.promoterToken.burn(
            msg.sender,
            venueId,
            promoterBalance
        );
    }

    function emergencyCancelPayment(
        address venue,
        address promoter
    ) external onlyOwner {
        Storage memory _storage = tapEarnStorage;

        uint256 venueId = venue.getVenueId();
        uint256 promoterBalance = _storage.contracts.promoterToken.balanceOf(
            promoter,
            venueId
        );

        _storage.contracts.promoterToken.burn(
            promoter,
            venueId,
            promoterBalance
        );

        _storage.contracts.venueToken.mint(
            venue,
            venueId,
            promoterBalance,
            _storage.contracts.venueToken.uri(venueId)
        );
    }

    function contracts() external view returns (Contracts memory) {
        return tapEarnStorage.contracts;
    }

    function fees() external view returns (Fees memory) {
        return tapEarnStorage.fees;
    }

    function paymentsInfo() external view returns (PaymentsInfo memory) {
        return tapEarnStorage.paymentsInfo;
    }

    function _swap(
        address recipient,
        uint256 amount
    ) internal returns (uint256 swapped) {
        if (recipient == address(0) || amount == 0) {
            return 0;
        }

        PaymentsInfo memory _paymentsInfo = tapEarnStorage.paymentsInfo;

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
        Fees memory _fees,
        RewardsInfo[5] memory _stakingRewards
    ) private {
        tapEarnStorage.contracts = _contracts;
        tapEarnStorage.paymentsInfo = _paymentsInfo;
        tapEarnStorage.fees = _fees;

        for (uint8 i = 0; i < 5; ++i) {
            stakingRewards[StakingTiers(i)] = _stakingRewards[i];
        }

        emit ParametersUpdated(
            _contracts,
            _paymentsInfo,
            _fees,
            _stakingRewards
        );
    }

    function _setVenueRules(address venue, VenueRules calldata rules) private {
        generalVenueInfo[venue].rules = rules;

        emit VenueRulesUpdated(venue, rules);
    }
}
