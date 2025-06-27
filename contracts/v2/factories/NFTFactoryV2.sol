// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";
import {LibClone} from "solady/src/utils/LibClone.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IQuoter} from "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";

import {ReferralSystemV2} from "./utils/ReferralSystemV2.sol";
import {AccessToken} from "../tokens/AccessToken.sol";
import {CreditToken} from "../tokens/CreditToken.sol";
import {RoyaltiesReceiverV2} from "../RoyaltiesReceiverV2.sol";
import {NftFactoryParameters, NftParameters, InstanceInfo, NftInstanceInfo, RoyaltiesParameters, VenueInfo, Implementations, SwapInfo, InvalidSignature} from "../../Structures.sol";

/**
 * @title NFT Factory Contract
 * @notice A factory contract to create new NFT instances with specific parameters.
 * @dev This contract allows producing NFTs, managing platform settings, and verifying signatures.
 */
contract NFTFactoryV2 is Initializable, Ownable, ReferralSystemV2 {
    // ========== Errors ==========

    /// @notice Error thrown when an NFT with the same name and symbol already exists.
    error NFTAlreadyExists();

    error TotalRoyaltiesExceed100Pecents();

    error WrongReferralCode(bytes32 referralCode);

    // ========== Events ==========

    /// @notice Event emitted when a new NFT is created.
    /// @param _hash The keccak256 hash of the NFT's name and symbol.
    /// @param info The information about the created NFT instance.
    event NFTCreated(bytes32 indexed _hash, NftInstanceInfo info);

    /// @notice Event emitted when the new factory parameters set.
    /// @param nftFactoryParameters The NFT factory parameters to be set.
    /// @param percentages The referral percentages for the system.
    event FactoryParametersSet(
        NftFactoryParameters nftFactoryParameters,
        uint16[5] percentages
    );
    /// @notice Emitted when the implementation address is upgraded.
    event ImplementationUpgraded(Implementations currentImplementations);
    event RoyaltiesUpgraded(RoyaltiesParameters amountToCreator);
    event VenueDeposit(uint256 venueId, uint256 amount, bytes32 referralCode);

    // ========== State Variables ==========

    /// @notice A struct that contains the NFT factory parameters.
    NftFactoryParameters private _nftFactoryParameters;

    /// @notice A mapping from keccak256(name, symbol) to the NFT instance address.
    mapping(bytes32 => NftInstanceInfo) public getNftInstanceInfo;

    Implementations public currentImplementations;

    RoyaltiesParameters internal _royaltiesParameters;

    SwapInfo public swapInfo;

    address public venueToken;

    mapping(uint256 venueId => mapping(bytes32 referralCode => uint256 remainingCredits))
        public venueAffiliateCredits;

    // ========== Functions ==========

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with NFT factory parameters and referral percentages.
     * @param nftFactoryParameters_ The NFT factory parameters to be set.
     * @param percentages The referral percentages for the system.
     */
    function initialize(
        NftFactoryParameters calldata nftFactoryParameters_,
        uint16[5] calldata percentages,
        RoyaltiesParameters calldata _royalties,
        Implementations calldata _implementations,
        address _venueToken,
        uint256 _referralCreditsAmount,
        uint256 _affiliatePercentage
    ) external initializer {
        _nftFactoryParameters = nftFactoryParameters_;
        venueToken = _venueToken;
        _setRoyalties(_royalties);
        _setImplementations(_implementations);

        _initializeReferralSystem(
            _referralCreditsAmount,
            _affiliatePercentage,
            percentages
        );

        _initializeOwner(msg.sender);
    }

    // function upgradeToV2(
    //     RoyaltiesParameters calldata _royalties,
    //     Implementations calldata _implementations
    // ) external reinitializer(2) {
    //     _setRoyalties(_royalties);
    //     _setImplementations(_implementations);
    // }

    /// @notice Upgrades the implementation contract for future clones.
    /// @dev Only callable by the contract owner.
    function setImplementations(
        Implementations calldata _implementations
    ) external onlyOwner {
        _setImplementations(_implementations);
    }

    /// @notice Upgrades the implementation contract for future clones.
    /// @dev Only callable by the contract owner.
    function setRoyalties(
        RoyaltiesParameters calldata _royalties
    ) external onlyOwner {
        _setRoyalties(_royalties);
    }

    /**
     * @notice Produces a new NFT i nstance.
     * @dev Creates a new instance of the NFT and adds the information to the storage contract.
     * @param instanceInfo Struct containing the details of the new NFT instance.
     * @param referralCode The referral code associated with this NFT instance.
     * @return accessToken The address of the created NFT instance.
     */
    function produce(
        InstanceInfo memory instanceInfo,
        bytes32 referralCode
    ) external returns (address accessToken) {
        NftFactoryParameters memory factoryParams = _nftFactoryParameters;

        // Name, symbol signed through BE, and checks if the size > 0.
        if (
            !SignatureCheckerLib.isValidSignatureNow(
                factoryParams.signerAddress,
                keccak256(
                    abi.encodePacked(
                        instanceInfo.metadata.name,
                        instanceInfo.metadata.symbol,
                        instanceInfo.contractURI,
                        instanceInfo.feeNumerator,
                        block.chainid
                    )
                ),
                instanceInfo.signature
            )
        ) {
            revert InvalidSignature();
        }

        bytes32 salt = keccak256(
            abi.encodePacked(
                instanceInfo.metadata.name,
                instanceInfo.metadata.symbol
            )
        );

        require(
            getNftInstanceInfo[salt].nftAddress == address(0),
            NFTAlreadyExists()
        );

        instanceInfo.payingToken = instanceInfo.payingToken == address(0)
            ? factoryParams.defaultPaymentCurrency
            : instanceInfo.payingToken;

        address receiver;

        _setReferralUser(referralCode, msg.sender);
        if (instanceInfo.feeNumerator > 0) {
            receiver = LibClone.clone(currentImplementations.royaltiesReceiver);
            RoyaltiesReceiverV2(payable(receiver)).initialize(
                RoyaltiesReceiverV2.RoyaltiesReceivers(
                    msg.sender,
                    factoryParams.platformAddress,
                    referrals[referralCode].creator
                ),
                address(this),
                referralCode
            );
        }

        accessToken = LibClone.cloneDeterministic(
            currentImplementations.accessToken,
            salt
        );
        AccessToken(accessToken).initialize(
            NftParameters({
                transferValidator: factoryParams.transferValidator,
                factory: address(this),
                info: instanceInfo,
                creator: msg.sender,
                feeReceiver: receiver,
                referralCode: referralCode
            })
        );

        NftInstanceInfo memory nftInstanceInfo = NftInstanceInfo({
            creator: msg.sender,
            nftAddress: accessToken,
            metadata: instanceInfo.metadata,
            royaltiesReceiver: receiver
        });

        getNftInstanceInfo[salt] = nftInstanceInfo;

        emit NFTCreated(salt, nftInstanceInfo);
    }

    function venueDeposit(
        VenueInfo calldata venueInfo,
        bytes32 referralCode
    ) external {
        if (
            !SignatureCheckerLib.isValidSignatureNow(
                _nftFactoryParameters.signerAddress,
                keccak256(
                    abi.encodePacked(
                        venueInfo.venue,
                        venueInfo.venueId,
                        venueInfo.amount,
                        block.chainid
                    )
                ),
                venueInfo.signature
            )
        ) {
            revert InvalidSignature();
        }

        uint256 amountToTransfer = venueInfo.amount;

        if (referralCode != bytes32(0)) {
            affiliate = referrals[referralCode].creator;
            require(affiliate != address(0), WrongReferralCode(referralCode));

            if (
                venueAffiliateCredits[venueInfo.venueId][referralCode] <
                referralCreditsAmount
            ) {
                SwapInfo memory _swapInfo = swapInfo;

                uint256 amountToSwap = _calculateRate(
                    venueInfo.amount,
                    affiliatePercentage
                );

                unchecked {
                    amountToTransfer -= amountToSwap;
                }

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
                        recipient: affiliate,
                        deadline: block.timestamp,
                        amountIn: amountToSwap,
                        amountOutMinimum: amountOutMinimum
                    });

                unchecked {
                    ++venueAffiliateCredits[venueInfo.venueId][referralCode];
                }

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
        }

        CreditToken(venueToken).mint(
            venueInfo.venue,
            venueInfo.venueId,
            amountToTransfer,
            venueInfo.uri
        );

        emit VenuePaidDeposit(
            venueInfo.venueId,
            amountToTransfer,
            referralCode
        );
    }

    /**
     * @notice Sets new factory parameters.
     * @dev Can only be called by the owner (BE).
     * @param nftFactoryParameters_ The NFT factory parameters to be set.
     * @param percentages An array containing the referral percentages for initial, second, third, and default use.
     */
    function setFactoryParameters(
        NftFactoryParameters calldata nftFactoryParameters_,
        uint16[5] calldata percentages
    ) external onlyOwner {
        _nftFactoryParameters = nftFactoryParameters_;
        _setReferralPercentages(percentages);

        emit FactoryParametersSet(nftFactoryParameters_, percentages);
    }

    /// @notice Returns the current NFT factory parameters.
    /// @return The NFT factory parameters.
    function nftFactoryParameters()
        external
        view
        returns (NftFactoryParameters memory)
    {
        return _nftFactoryParameters;
    }

    function royaltiesParameters()
        external
        view
        returns (RoyaltiesParameters memory)
    {
        return _royaltiesParameters;
    }

    function _setImplementations(
        Implementations calldata _implementations
    ) private {
        currentImplementations = _implementations;
        emit ImplementationUpgraded(_implementations);
    }

    function _setRoyalties(RoyaltiesParameters calldata _royalties) private {
        require(
            _royalties.amountToCreator + _royalties.amountToPlatform <= 10000,
            TotalRoyaltiesExceed100Pecents()
        );

        _royaltiesParameters = _royalties;

        emit RoyaltiesUpgraded(_royalties);
    }
}
