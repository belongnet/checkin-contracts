// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";

import {ReferralSystem} from "../utils/ReferralSystem.sol";

import {NFT} from "../NFT.sol";

import {RoyaltiesReceiver} from "../RoyaltiesReceiver.sol";

import {NftFactoryParameters, NftParameters, InstanceInfo, NftInstanceInfo, InvalidSignature} from "../Structures.sol";

// ========== Errors ==========

/// @notice Error thrown when an NFT with the same name and symbol already exists.
error NFTAlreadyExists();

/**
 * @title NFT Factory Contract
 * @notice A factory contract to create new NFT instances with specific parameters.
 * @dev This contract allows producing NFTs, managing platform settings, and verifying signatures.
 */
contract NFTFactory is Initializable, Ownable, ReferralSystem {
    using SignatureCheckerLib for address;

    // ========== Events ==========

    /// @notice Event emitted when a new NFT is created.
    /// @param _hash The keccak256 hash of the NFT's name and symbol.
    /// @param info The information about the created NFT instance.
    event NFTCreated(bytes32 indexed _hash, NftInstanceInfo info);

    /// @notice Event emitted when the new factory parameters set.
    /// @param percentages The referral percentages for the system.
    /// @param nftFactoryParameters The NFT factory parameters to be set.
    event FactoryParametersSet(
        NftFactoryParameters nftFactoryParameters,
        uint16[5] percentages
    );

    // ========== State Variables ==========

    /// @notice A struct that contains the NFT factory parameters.
    NftFactoryParameters private _nftFactoryParameters;

    /// @notice A mapping from keccak256(name, symbol) to the NFT instance address.
    mapping(bytes32 => NftInstanceInfo) public getNftInstanceInfo;

    // ========== Modifiers ==========

    // ========== Functions ==========

    /**
     * @notice Initializes the contract with NFT factory parameters and referral percentages.
     * @param percentages The referral percentages for the system.
     * @param nftFactoryParameters_ The NFT factory parameters to be set.
     */
    function initialize(
        NftFactoryParameters calldata nftFactoryParameters_,
        uint16[5] calldata percentages
    ) external initializer {
        _nftFactoryParameters = nftFactoryParameters_;
        _setReferralPercentages(percentages);

        _initializeOwner(msg.sender);
    }

    /**
     * @notice Produces a new NFT instance.
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
                        _info.feeReceiver,
                        block.chainid
                    )
                ),
                _info.signature
            )
        ) {
            revert InvalidSignature();
        }

        bytes32 _hash = keccak256(
            abi.encodePacked(_info.metadata.name, _info.metadata.symbol)
        );

        require(
            getNftInstanceInfo[_hash].nftAddress == address(0),
            NFTAlreadyExists()
        );

        _info.payingToken = _info.payingToken == address(0)
            ? params.defaultPaymentCurrency
            : _info.payingToken;

        RoyaltiesReceiver receiver = new RoyaltiesReceiver(
            [msg.sender, params.platformAddress],
            [8000, 2000]
        );

        nftAddress = address(
            new NFT(
                NftParameters({
                    transferValidator: params.transferValidator,
                    factory: address(this),
                    info: _info,
                    creator: msg.sender,
                    referralCode: referralCode
                })
            )
        );

        NftInstanceInfo memory info = NftInstanceInfo({
            creator: msg.sender,
            nftAddress: nftAddress,
            metadata: _info.metadata
        });

        getNftInstanceInfo[_hash] = info;

        _setReferralUser(referralCode, msg.sender);

        emit NFTCreated(_hash, info);
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
}
