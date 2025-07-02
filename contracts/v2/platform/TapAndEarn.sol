// // SPDX-License-Identifier: UNLICENSED
// pragma solidity 0.8.27;

// import {Initializable} from "solady/src/utils/Initializable.sol";
// import {Ownable} from "solady/src/auth/Ownable.sol";
// import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";
// import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
// import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
// import {IQuoter} from "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";

// import {CreditToken} from "../tokens/CreditToken.sol";
// import {ReferralToken} from "../tokens/ReferralToken.sol";
// import {InvalidSignature} from "../../Structures.sol";

// /**
//  * @title NFT Factory Contract
//  * @notice A factory contract to create new NFT instances with specific parameters.
//  * @dev This contract allows producing NFTs, managing platform settings, and verifying signatures.
//  */
// contract TapAndEarn is Initializable, Ownable {
//     using SignatureCheckerLib for address;
//     struct Tokens {
//         address venueToken;
//         address promoterToken;
//     }

//     struct SwapInfo {
//         uint24 poolFees;
//         address uniswapV3Router;
//         address uniswapV3Quoter;
//         address weth;
//         address tokenFrom; // eg USDC
//         address tokenTo; // eg LONG
//     }

//     struct VenueInfo {
//         address venue;
//         uint256 amount;
//         string uri;
//         bytes signature;
//     }

//     struct CustomerInfo {
//         address venueToPayFor;
//         address promoter;
//         uint256 amount;
//         bytes signature;
//     }

//     // ========== Errors ==========

//     error WrongReferralCode(bytes32 referralCode);

//     // ========== Events ==========

//     event TokensUpgraded(Tokens tokens);
//     event VenuePaidDeposit(
//         address indexed venue,
//         uint256 amount,
//         bytes32 referralCode
//     );

//     // ========== State Variables ==========

//     /// @notice A struct that contains the NFT factory parameters.
//     TapAndEarnParameters private _tapAndEarnParameters;

//     SwapInfo public swapInfo;

//     Tokens public currentTokens;

//     mapping(address venue => mapping(bytes32 referralCode => uint256 remainingCredits))
//         public venueAffiliateCredits;

//     // ========== Functions ==========

//     /// @custom:oz-upgrades-unsafe-allow constructor
//     constructor() {
//         _disableInitializers();
//     }

//     /**
//      * @notice Initializes the contract with NFT factory parameters and referral percentages.
//      * @param nftFactoryParameters_ The NFT factory parameters to be set.
//      * @param percentages The referral percentages for the system.
//      */
//     function initialize(
//         address _owner,
//         Tokens calldata _tokens
//     ) external initializer {
//         _setTokens(_tokens);

//         _initializeOwner(_owner);
//     }

//     // function upgradeToV2(
//     //     RoyaltiesParameters calldata _royalties,
//     //     Implementations calldata _implementations
//     // ) external reinitializer(2) {
//     //     _setRoyalties(_royalties);
//     //     _setImplementations(_implementations);
//     // }

//     /// @notice Upgrades the implementation contract for future clones.
//     /// @dev Only callable by the contract owner.
//     function setTokens(Tokens calldata _tokens) external onlyOwner {
//         _setTokens(_tokens);
//     }

//     function venueDeposit(
//         VenueInfo calldata venueInfo,
//         bytes32 referralCode
//     ) external {
//         if (
//             !SignatureCheckerLib.isValidSignatureNow(
//                 _nftFactoryParameters.signer,
//                 keccak256(
//                     abi.encodePacked(
//                         venueInfo.venue,
//                         venueInfo.amount,
//                         block.chainid
//                     )
//                 ),
//                 venueInfo.signature
//             )
//         ) {
//             revert InvalidSignature();
//         }

//         if (referralCode != bytes32(0)) {
//             address affiliate = referrals[referralCode].creator;
//             require(affiliate != address(0), WrongReferralCode(referralCode));

//             if (
//                 venueAffiliateCredits[venueInfo.venue][referralCode] <
//                 referralCreditsAmount
//             ) {
//                 unchecked {
//                     ++venueAffiliateCredits[venueInfo.venue][referralCode];
//                 }
//                 _swap(venueInfo.amount, affiliate);
//             }
//         }

//         CreditToken(venueToken).mint(
//             venueInfo.venue,
//             getVenueId(venueInfo.venue),
//             venueInfo.amount,
//             venueInfo.uri
//         );

//         emit VenuePaidDeposit(venueInfo.venue, venueInfo.amount, referralCode);
//     }

//     function payToVenue(CustomerInfo calldata customerInfo) external {
//         if (
//             !SignatureCheckerLib.isValidSignatureNow(
//                 _nftFactoryParameters.signer,
//                 keccak256(
//                     abi.encodePacked(
//                         customerInfo.venueToPayFor,
//                         customerInfo.promoter,
//                         customerInfo.amount,
//                         block.chainid
//                     )
//                 ),
//                 customerInfo.signature
//             )
//         ) {
//             revert InvalidSignature();
//         }

//         ReferralToken(venueToken).mint(
//             venueInfo.venue,
//             getVenueId(venueInfo.venue),
//             venueInfo.amount,
//             venueInfo.uri
//         );
//     }

//     // function settlePromoterPayment(address venue, address promoter, ) external {
//     //     if (
//     //         !SignatureCheckerLib.isValidSignatureNow(
//     //             _nftFactoryParameters.signer,
//     //             keccak256(
//     //                 abi.encodePacked(
//     //                     venueInfo.venue,
//     //                     venueInfo.amount,
//     //                     block.chainid
//     //                 )
//     //             ),
//     //             venueInfo.signature
//     //         )
//     //     ) {
//     //         revert InvalidSignature();
//     //     }
//     // }

//     function _swap(uint256 amount, address recipient) internal {
//         SwapInfo memory _swapInfo = swapInfo;

//         uint256 amountToSwap = _calculateRate(amount, affiliatePercentage);

//         bytes memory path = abi.encodePacked(
//             _swapInfo.tokenFrom,
//             _swapInfo.poolFees,
//             _swapInfo.weth,
//             _swapInfo.poolFees,
//             _swapInfo.tokenTo
//         );
//         uint256 amountOutMinimum = IQuoter(_swapInfo.uniswapV3Quoter)
//             .quoteExactInput(path, amountToSwap);
//         ISwapRouter.ExactInputParams memory swapParams = ISwapRouter
//             .ExactInputParams({
//                 path: path,
//                 recipient: recipient,
//                 deadline: block.timestamp,
//                 amountIn: amountToSwap,
//                 amountOutMinimum: amountOutMinimum
//             });

//         SafeTransferLib.safeTransferFrom(
//             _swapInfo.tokenFrom,
//             msg.sender,
//             address(this),
//             amountToSwap
//         );
//         SafeTransferLib.safeApprove(
//             _swapInfo.tokenFrom,
//             _swapInfo.uniswapV3Router,
//             amountToSwap
//         );
//         ISwapRouter(_swapInfo.uniswapV3Router).exactInput(swapParams);
//     }

//     function _setTokens(Implementations calldata _tokens) private {
//         currentTokens = _tokens;
//         emit TokensUpgraded(_tokens);
//     }
// }
