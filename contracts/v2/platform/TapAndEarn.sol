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
import {VenueInfo, CustomerInfo} from "../Structures.sol";

/**
 * @title NFT Factory Contract
 * @notice A factory contract to create new NFT instances with specific parameters.
 * @dev This contract allows producing NFTs, managing platform settings, and verifying signatures.
 */
contract TapAndEarn is Initializable, Ownable {
    using SignatureVerifier for address;

    struct Tokens {
        address venue;
        address promoter;
    }

    struct SwapInfo {
        uint24 poolFees;
        address uniswapV3Router;
        address uniswapV3Quoter;
        address weth;
        address tokenFrom; // eg USDC
        address tokenTo; // eg LONG
    }

    // ========== Errors ==========

    error WrongReferralCode(bytes32 referralCode);

    // ========== Events ==========
    event ParametersUpdated(
        Tokens tokens,
        SwapInfo swapInfo,
        uint256 affiliatePercentage
    );
    event VenuePaidDeposit(
        address indexed venue,
        uint256 amount,
        bytes32 referralCode
    );

    // ========== State Variables ==========

    Factory public factory;

    SwapInfo public swapInfo;

    Tokens public tokens;

    uint256 public affiliatePercentage;

    mapping(address venue => mapping(bytes32 referralCode => uint256 remainingCredits))
        public venueAffiliateCredits;

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
        SwapInfo calldata _swapInfo,
        uint256 _affiliatePercentage
    ) external initializer {
        factory = _factory;
        _setParameters(_tokens, _swapInfo, _affiliatePercentage);

        _initializeOwner(_owner);
    }

    function setParameters(
        Tokens calldata _tokens,
        SwapInfo calldata _swapInfo,
        uint256 _affiliatePercentage
    ) external onlyOwner {
        _setParameters(_tokens, _swapInfo, _affiliatePercentage);
    }

    function venueDeposit(
        VenueInfo calldata venueInfo,
        bytes32 referralCode
    ) external {
        Factory _factory = factory;
        _factory.nftFactoryParameters().signer.checkVenueInfo(venueInfo);

        if (referralCode != bytes32(0)) {
            address affiliate = _factory.getReferralCreator(referralCode);
            require(affiliate != address(0), WrongReferralCode(referralCode));

            if (
                venueAffiliateCredits[venueInfo.venue][referralCode] <
                _factory.referralCreditsAmount()
            ) {
                unchecked {
                    ++venueAffiliateCredits[venueInfo.venue][referralCode];
                }
                _swap(venueInfo.amount, affiliate);
            }
        }

        CreditToken(tokens.venue).mint(
            venueInfo.venue,
            getVenueId(venueInfo.venue),
            venueInfo.amount,
            venueInfo.uri
        );

        emit VenuePaidDeposit(venueInfo.venue, venueInfo.amount, referralCode);
    }

    function payToVenue(CustomerInfo calldata customerInfo) external {
        factory.nftFactoryParameters().signer.checkCustomerInfo(customerInfo);

        uint256 venueId = getVenueId(customerInfo.venueToPayFor);
        Tokens memory _tokens = tokens;
        CreditToken(_tokens.promoter).mint(
            customerInfo.promoter,
            venueId,
            customerInfo.amount,
            CreditToken(_tokens.venue).uri(venueId)
        );
    }

    // function settlePromoterPayment(address venue, address promoter, ) external {
    //     if (
    //         !SignatureCheckerLib.isValidSignatureNow(
    //             _nftFactoryParameters.signer,
    //             keccak256(
    //                 abi.encodePacked(
    //                     venueInfo.venue,
    //                     venueInfo.amount,
    //                     block.chainid
    //                 )
    //             ),
    //             venueInfo.signature
    //         )
    //     ) {
    //         revert InvalidSignature();
    //     }
    // }

    function getVenueId(address venue) public pure returns (uint256) {
        return uint256(uint160(venue));
    }

    function _swap(uint256 amount, address recipient) internal {
        SwapInfo memory _swapInfo = swapInfo;

        uint256 amountToSwap = factory.calculateRate(
            amount,
            affiliatePercentage
        );

        bytes memory path = abi.encodePacked(
            _swapInfo.tokenFrom,
            _swapInfo.poolFees,
            _swapInfo.weth,
            _swapInfo.poolFees,
            _swapInfo.tokenTo
        );
        uint256 amountOutMinimum = IQuoter(_swapInfo.uniswapV3Quoter)
            .quoteExactInput(path, amountToSwap);
        ISwapRouter.ExactInputParams memory swapParams = ISwapRouter
            .ExactInputParams({
                path: path,
                recipient: recipient,
                deadline: block.timestamp,
                amountIn: amountToSwap,
                amountOutMinimum: amountOutMinimum
            });

        SafeTransferLib.safeTransferFrom(
            _swapInfo.tokenFrom,
            msg.sender,
            address(this),
            amountToSwap
        );
        SafeTransferLib.safeApprove(
            _swapInfo.tokenFrom,
            _swapInfo.uniswapV3Router,
            amountToSwap
        );
        ISwapRouter(_swapInfo.uniswapV3Router).exactInput(swapParams);
    }

    function _setParameters(
        Tokens calldata _tokens,
        SwapInfo calldata _swapInfo,
        uint256 _affiliatePercentage
    ) private {
        tokens = _tokens;
        swapInfo = _swapInfo;
        affiliatePercentage = _affiliatePercentage;
        emit ParametersUpdated(_tokens, _swapInfo, _affiliatePercentage);
    }
}
