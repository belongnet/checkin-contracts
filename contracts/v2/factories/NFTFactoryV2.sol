// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";
import {LibClone} from "solady/src/utils/LibClone.sol";

import {ReferralSystemV2} from "./utils/ReferralSystemV2.sol";

import {NFTV2} from "../NFTV2.sol";

import {RoyaltiesReceiverV2} from "../RoyaltiesReceiverV2.sol";

import {NftFactoryParameters, NftParameters, InstanceInfo, NftInstanceInfo, InvalidSignature} from "../../Structures.sol";

// ========== Errors ==========

/// @notice Error thrown when an NFT with the same name and symbol already exists.
error NFTAlreadyExists();

/**
 * @title NFT Factory Contract
 * @notice A factory contract to create new NFT instances with specific parameters.
 * @dev This contract allows producing NFTs, managing platform settings, and verifying signatures.
 */
contract NFTFactoryV2 is Initializable, Ownable, ReferralSystemV2 {
    using SignatureCheckerLib for address;
    using LibClone for address;

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

    // ========== State Variables ==========

    /// @notice A struct that contains the NFT factory parameters.
    NftFactoryParameters private _nftFactoryParameters;

    /// @notice A mapping from keccak256(name, symbol) to the NFT instance address.
    mapping(bytes32 => NftInstanceInfo) public getNftInstanceInfo;

    struct RoyaltiesParameters {
        uint16 amountToCreator;
        uint16 amountToPlatform;
    }

    struct Implementations {
        address nft;
        address royaltiesReceiver;
    }

    Implementations public currentImplementations;

    RoyaltiesParameters internal _royaltiesParameters;

    error TotalRoyaltiesExceed100Pecents();

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
        Implementations calldata _implementations
    ) external initializer {
        _nftFactoryParameters = nftFactoryParameters_;
        _setReferralPercentages(percentages);

        _initializeOwner(msg.sender);

        _upgradeRoyalties(_royalties);
        _upgradeImplementations(_implementations);
    }

    // function upgradeToV2(
    //     RoyaltiesParameters calldata _royalties,
    //     Implementations calldata _implementations
    // ) external reinitializer(2) {
    //     _upgradeRoyalties(_royalties);
    //     _upgradeImplementations(_implementations);
    // }

    /// @notice Upgrades the implementation contract for future clones.
    /// @dev Only callable by the contract owner.
    function upgradeImplementations(
        Implementations calldata _implementations
    ) external onlyOwner {
        _upgradeImplementations(_implementations);
    }

    /// @notice Upgrades the implementation contract for future clones.
    /// @dev Only callable by the contract owner.
    function upgradeRoyalties(
        RoyaltiesParameters calldata _royalties
    ) external onlyOwner {
        _upgradeRoyalties(_royalties);
    }

    /**
     * @notice Produces a new NFT i nstance.
     * @dev Creates a new instance of the NFT and adds the information to the storage contract.
     * @param _info Struct containing the details of the new NFT instance.
     * @param referralCode The referral code associated with this NFT instance.
     * @return nftAddress The address of the created NFT instance.
     */
    function produce(
        InstanceInfo memory _info,
        bytes32 referralCode
    ) external returns (address nftAddress) {
        NftFactoryParameters memory params = _nftFactoryParameters;

        // Name, symbol signed through BE, and checks if the size > 0.
        if (
            !params.signerAddress.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        _info.metadata.name,
                        _info.metadata.symbol,
                        _info.contractURI,
                        _info.feeNumerator,
                        block.chainid
                    )
                ),
                _info.signature
            )
        ) {
            revert InvalidSignature();
        }

        bytes32 salt = keccak256(
            abi.encodePacked(_info.metadata.name, _info.metadata.symbol)
        );

        require(
            getNftInstanceInfo[salt].nftAddress == address(0),
            NFTAlreadyExists()
        );

        _info.payingToken = _info.payingToken == address(0)
            ? params.defaultPaymentCurrency
            : _info.payingToken;

        address receiver;

        _setReferralUser(referralCode, msg.sender);
        if (_info.feeNumerator > 0) {
            receiver = currentImplementations.royaltiesReceiver.clone();
            RoyaltiesReceiverV2(payable(receiver)).initialize(
                RoyaltiesReceiverV2.RoyaltiesReceivers(
                    msg.sender,
                    params.platformAddress,
                    referrals[referralCode].creator
                ),
                address(this),
                referralCode
            );
        }

        nftAddress = currentImplementations.nft.cloneDeterministic(salt);
        NFTV2(nftAddress).initialize(
            NftParameters({
                transferValidator: params.transferValidator,
                factory: address(this),
                info: _info,
                creator: msg.sender,
                feeReceiver: receiver,
                referralCode: referralCode
            })
        );

        NftInstanceInfo memory info = NftInstanceInfo({
            creator: msg.sender,
            nftAddress: nftAddress,
            metadata: _info.metadata,
            royaltiesReceiver: receiver
        });

        getNftInstanceInfo[salt] = info;

        emit NFTCreated(salt, info);
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

    function getReferralShare(
        address referralUser,
        bytes32 code
    ) public view returns (uint256) {
        return
            getReferralRate(
                referralUser,
                code,
                _royaltiesParameters.amountToPlatform
            );
    }

    function _upgradeImplementations(
        Implementations calldata _implementations
    ) private {
        currentImplementations = _implementations;
        emit ImplementationUpgraded(_implementations);
    }

    function _upgradeRoyalties(
        RoyaltiesParameters calldata _royalties
    ) private {
        require(
            _royalties.amountToCreator + _royalties.amountToPlatform <= 10000,
            TotalRoyaltiesExceed100Pecents()
        );

        _royaltiesParameters = _royalties;

        emit RoyaltiesUpgraded(_royalties);
    }
}
