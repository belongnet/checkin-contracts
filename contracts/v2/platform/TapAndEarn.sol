// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IQuoter} from "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";

import {Factory} from "./Factory.sol";
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
    using SafeTransferLib for address;

    struct Tokens {
        CreditToken venueToken;
        CreditToken promoterToken;
    }

    struct PromoterStakingTiersInfo {
        uint256 platformFeePercentage;
        uint256 bonusPercentage;
    }

    struct PromoterStakingTiers {
        PromoterStakingTiersInfo regularTier;
        PromoterStakingTiersInfo bronzeTier;
        PromoterStakingTiersInfo silverTier;
        PromoterStakingTiersInfo goldTier;
        PromoterStakingTiersInfo platinumTier;
    }

    struct VenueStakingTiers {
        uint256 tier1DepositFeePercentage; // 10%
        uint256 tier2DepositFeePercentage; // 5%
        uint256 tier3DepositFeePercentage; // 2.5%
    }

    struct DepositTimelocks {
        uint256 timelock1;
        uint256 timelock2;
        uint256 timelock3;
        uint256 timelock4;
        uint256 timelock5;
    }

    struct PaymentsInfo {
        uint24 uniswapPoolFees;
        address uniswapV3Router;
        address uniswapV3Quoter;
        address weth;
        address depositToken; // eg USDC
        address withdrawalToken; // eg LONG
    }

    // ========== Errors ==========

    error WrongReferralCode(bytes32 referralCode);
    error CanNotClaim(address venue, address promoter);
    error PaymentInTimelock(address venue, address promoter, uint256 amount);

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

    event TiersUpdated(
        PromoterStakingTiers promoterTiers,
        VenueStakingTiers venueTiers
    );

    // ========== State Variables ==========

    Factory public factory;

    PaymentsInfo public paymentsInfo;

    Tokens public tokens;

    PromoterStakingTiers private _promoterStakingTiers;

    VenueStakingTiers private _venueStakingTiers;

    DepositTimelocks private _depositTimelocks;

    uint256 public affiliatePercentage;

    uint256 public referralCreditsAmount;

    mapping(address venue => VenueRules rules) public venueRules;

    mapping(address venue => mapping(bytes32 referralCode => uint256 remainingCredits))
        public venueAffiliateCredits;

    mapping(address venue => mapping(address promoter => uint256 paymentTime))
        public venuePromoterPaymentTime;

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
        Factory _factory,
        Tokens calldata _tokens,
        PaymentsInfo calldata _paymentsInfo,
        uint256 _affiliatePercentage,
        uint256 credits
    ) external initializer {
        factory = _factory;

        _setTiers(
            PromoterStakingTiers({
                regularTier: PromoterStakingTiersInfo({
                    platformFeePercentage: 2000, //20%
                    bonusPercentage: 500 // 5%
                }),
                bronzeTier: PromoterStakingTiersInfo({
                    platformFeePercentage: 1800, // 18%
                    bonusPercentage: 600 // 6%
                }),
                silverTier: PromoterStakingTiersInfo({
                    platformFeePercentage: 1500, // 15%
                    bonusPercentage: 800 // 8%
                }),
                goldTier: PromoterStakingTiersInfo({
                    platformFeePercentage: 1000, // 10%
                    bonusPercentage: 1000 // 10%
                }),
                platinumTier: PromoterStakingTiersInfo({
                    platformFeePercentage: 500, // 5%
                    bonusPercentage: 1500 // 15%
                })
            }),
            VenueStakingTiers({
                tier1DepositFeePercentage: 1000, // 10%
                tier2DepositFeePercentage: 500, // 5%
                tier3DepositFeePercentage: 250 // 2.5%
            })
        );

        _setParameters(
            _tokens,
            _paymentsInfo,
            DepositTimelocks({
                timelock1: 0, // 0 seconds
                timelock2: 1 hours, // 1 hour
                timelock3: 6 hours, // 6 hours
                timelock4: 24 hours, // 24 hours
                timelock5: 48 hours // 48 hours
            }),
            _affiliatePercentage,
            credits
        );

        _initializeOwner(_owner);
    }

    function setParameters(
        Tokens calldata _tokens,
        PaymentsInfo calldata _paymentsInfo,
        DepositTimelocks memory _depositTimes,
        uint256 _affiliatePercentage,
        uint256 _credits
    ) external onlyOwner {
        _setParameters(
            _tokens,
            _paymentsInfo,
            _depositTimes,
            _affiliatePercentage,
            _credits
        );
    }

    function venueDeposit(VenueInfo calldata venueInfo) external {
        Factory _factory = factory;
        _factory.nftFactoryParameters().signer.checkVenueInfo(venueInfo);

        address affiliate;
        uint256 amountToSwap;
        if (venueInfo.referralCode != bytes32(0)) {
            affiliate = _factory.getReferralCreator(venueInfo.referralCode);
            require(
                affiliate != address(0),
                WrongReferralCode(venueInfo.referralCode)
            );

            if (
                venueAffiliateCredits[venueInfo.venue][venueInfo.referralCode] <
                referralCreditsAmount
            ) {
                amountToSwap = factory.calculateRate(
                    venueInfo.amount,
                    affiliatePercentage
                );
                unchecked {
                    ++venueAffiliateCredits[venueInfo.venue][
                        venueInfo.referralCode
                    ];
                }
            }
        }

        venueRules[venueInfo.venue] = venueInfo.rules;

        SafeTransferLib.safeTransferFrom(
            paymentsInfo.depositToken,
            venueInfo.venue,
            address(this),
            venueInfo.amount
        );

        _swap(affiliate, amountToSwap);

        tokens.venueToken.mint(
            venueInfo.venue,
            getVenueId(venueInfo.venue),
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
        factory.nftFactoryParameters().signer.checkCustomerInfo(customerInfo);

        uint256 venueId = getVenueId(customerInfo.venueToPayFor);
        Tokens memory _tokens = tokens;

        venuePromoterPaymentTime[customerInfo.venueToPayFor][
            customerInfo.promoter
        ] = block.timestamp;

        paymentsInfo.depositToken.safeTransferFrom(
            customerInfo.customer,
            customerInfo.venueToPayFor,
            customerInfo.amount
        );

        _tokens.venueToken.burn(
            customerInfo.venueToPayFor,
            venueId,
            customerInfo.amount
        );

        _tokens.promoterToken.mint(
            customerInfo.promoter,
            venueId,
            customerInfo.amount,
            _tokens.venueToken.uri(venueId)
        );
    }

    function getThePromoterPayments(address venue, bool paymentInUsd) external {
        uint256 venueId = getVenueId(venue);
        CreditToken promoterToken = tokens.promoterToken;
        //TODO: not sure what amount should be transfered to promoter and burned in proimoterToken
        uint256 promoterBalance = promoterToken.balanceOf(msg.sender, venueId);

        require(promoterBalance > 0, CanNotClaim(venue, msg.sender));

        require(
            block.timestamp >=
                venuePromoterPaymentTime[venue][msg.sender] -
                    depositTimelocks(promoterBalance),
            PaymentInTimelock(venue, msg.sender, promoterBalance)
        );

        if (paymentInUsd) {
            paymentsInfo.depositToken.safeTransfer(msg.sender, promoterBalance);
        } else {
            //promoterBalance + BONUS
            _swap(msg.sender, promoterBalance);
        }

        promoterToken.burn(msg.sender, venueId, promoterBalance);
    }

    function emergencyCancelPayment(
        address venue,
        address promoter
    ) external onlyOwner {
        uint256 venueId = getVenueId(venue);
        uint256 promoterBalance = tokens.promoterToken.balanceOf(
            promoter,
            venueId
        );
        require(
            block.timestamp <
                venuePromoterPaymentTime[venue][promoter] -
                    depositTimelocks(promoterBalance),
            PaymentInTimelock(venue, promoter, promoterBalance)
        );

        Tokens memory _tokens = tokens;
        uint256 amount = _tokens.promoterToken.balanceOf(promoter, venueId);

        _tokens.promoterToken.burn(promoter, venueId, amount);

        _tokens.venueToken.mint(
            venue,
            venueId,
            amount,
            _tokens.venueToken.uri(venueId)
        );
    }

    function getVenueId(address venue) public pure returns (uint256) {
        return uint256(uint160(venue));
    }

    function promoterStakingTiers(
        uint256 amountStaked
    ) public view returns (PromoterStakingTiersInfo memory) {
        if (amountStaked < 50000) {
            return _promoterStakingTiers.regularTier;
        } else if (amountStaked >= 50000 && amountStaked < 250000) {
            return _promoterStakingTiers.bronzeTier;
        } else if (amountStaked >= 250000 && amountStaked < 500000) {
            return _promoterStakingTiers.silverTier;
        } else if (amountStaked >= 500000 && amountStaked < 1000000) {
            return _promoterStakingTiers.goldTier;
        }
        return _promoterStakingTiers.platinumTier;
    }

    function venueStakingTiers(
        uint256 amountStaked
    ) public view returns (uint256 depositFeePercentage) {
        if (amountStaked < 250000) {
            depositFeePercentage = _venueStakingTiers.tier1DepositFeePercentage;
        } else if (amountStaked >= 250000 && amountStaked < 500000) {
            depositFeePercentage = _venueStakingTiers.tier2DepositFeePercentage;
        }
        depositFeePercentage = _venueStakingTiers.tier3DepositFeePercentage;
    }

    function depositTimelocks(
        uint256 amount
    ) public view returns (uint256 time) {
        if (amount <= 100) {
            time = _depositTimelocks.timelock1; // 0 seconds
        } else if (amount > 100 && amount <= 500) {
            time = _depositTimelocks.timelock2; // 1 hour
        } else if (amount > 500 && amount <= 1000) {
            time = _depositTimelocks.timelock3; // 6 hours
        } else if (amount > 1000 && amount <= 5000) {
            time = _depositTimelocks.timelock4; // 24 hours
        }
        time = _depositTimelocks.timelock5; // 48 hours
    }

    function _swap(address recipient, uint256 amount) internal {
        if (amount == 0) {
            return;
        }

        PaymentsInfo memory _paymentsInfo = paymentsInfo;

        bytes memory path = abi.encodePacked(
            _paymentsInfo.depositToken,
            _paymentsInfo.uniswapPoolFees,
            _paymentsInfo.weth,
            _paymentsInfo.uniswapPoolFees,
            _paymentsInfo.withdrawalToken
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
            _paymentsInfo.depositToken,
            _paymentsInfo.uniswapV3Router,
            amount
        );
        ISwapRouter(_paymentsInfo.uniswapV3Router).exactInput(swapParams);
    }

    function _setParameters(
        Tokens calldata _tokens,
        PaymentsInfo calldata _paymentsInfo,
        DepositTimelocks memory _depositTimes,
        uint256 _affiliatePercentage,
        uint256 _referralCreditsAmount
    ) private {
        tokens = _tokens;
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
        PromoterStakingTiers memory promoterTiers,
        VenueStakingTiers memory venueTiers
    ) private {
        _promoterStakingTiers = promoterTiers;
        _venueStakingTiers = venueTiers;
        emit TiersUpdated(promoterTiers, venueTiers);
    }
}
