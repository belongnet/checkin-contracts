// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";

import {ReferralSystem} from "../utils/ReferralSystem.sol";

import {NFT} from "../NFT.sol";

import {ReferralPercentages, NftFactoryParameters, NftParameters, InstanceInfo, NftInstanceInfo} from "../Structures.sol";

// ========== Errors ==========

/// @notice Error thrown when the signature provided is invalid.
error InvalidSignature();

/// @notice Error thrown when an empty name or symbol is provided for an NFT.
/// @param name The name that was passed (empty).
/// @param symbol The symbol that was passed (empty).
error EmptyNameSymbolPassed(string name, string symbol);

/// @notice Error thrown when an NFT with the same name and symbol already exists.
error NFTAlreadyExists();

/// @notice Error thrown when a zero address is passed where it's not allowed.
error ZeroAddressPassed();

/// @notice Error thrown when a zero amount is passed where it's not allowed.
error ZeroAmountPassed();

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

    /// @notice Event emitted when the platform address and commission is set.
    /// @param newPlatformAddress The new platform address.
    /// @param newCommission The new platform commission in basis points.
    event PlatformParametersSet(
        address newPlatformAddress,
        uint256 newCommission
    );

    /// @notice Event emitted when the new factory parameters set.
    /// @param newSigner The new signer address.
    /// @param defaultPaymentCurrency The new default payment currency.
    /// @param newValidator The new transfer validator contract.
    /// @param arraySize The new maximum array size.
    event FactoryParametersSet(
        address newSigner,
        address defaultPaymentCurrency,
        address newValidator,
        uint256 arraySize
    );

    // ========== State Variables ==========

    /// @notice A struct that contains the NFT factory parameters.
    NftFactoryParameters private _nftFactoryParameters;

    /// @notice A mapping from keccak256(name, symbol) to the NFT instance address.
    mapping(bytes32 => NftInstanceInfo) public getNftInstanceInfo;

    // ========== Modifiers ==========

    /// @notice Modifier to check if the passed address is not zero.
    /// @param _address The address to check.
    modifier zeroAddressCheck(address _address) {
        if (_address == address(0)) {
            revert ZeroAddressPassed();
        }
        _;
    }

    // ========== Functions ==========

    /**
     * @notice Initializes the contract with NFT factory parameters and referral percentages.
     * @param percentages The referral percentages for the system.
     * @param nftFactoryParameters_ The NFT factory parameters to be set.
     */
    function initialize(
        ReferralPercentages calldata percentages,
        NftFactoryParameters calldata nftFactoryParameters_
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
        require(
            (bytes(_info.name)).length != 0 &&
                (bytes(_info.symbol)).length != 0,
            EmptyNameSymbolPassed(_info.name, _info.symbol)
        );

        bytes32 _hash = keccak256(abi.encodePacked(_info.name, _info.symbol));

        require(
            getNftInstanceInfo[_hash].nftAddress == address(0),
            NFTAlreadyExists()
        );

        NftFactoryParameters memory params = _nftFactoryParameters;

        if (
            !params.signerAddress.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        _info.name,
                        _info.symbol,
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

        _info.payingToken = _info.payingToken == address(0)
            ? params.defaultPaymentCurrency
            : _info.payingToken;

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
            name: _info.name,
            symbol: _info.symbol,
            creator: msg.sender,
            nftAddress: nftAddress
        });

        getNftInstanceInfo[_hash] = info;

        _setReferralUser(referralCode, msg.sender);

        emit NFTCreated(_hash, info);
    }

    /**
     * @notice Sets new factory parameters.
     * @dev Can only be called by the owner.
     * @param _signer The new signer address.
     * @param _paymentCurrency The new default payment currency address.
     * @param _validator The new transfer validator contract.
     * @param _arraySize The new maximum array size.
     */
    function setFactoryParameters(
        address _signer,
        address _paymentCurrency,
        address _validator,
        uint256 _arraySize,
        ReferralPercentages calldata percentages
    )
        external
        onlyOwner
        zeroAddressCheck(_signer)
        zeroAddressCheck(_paymentCurrency)
    {
        require(_arraySize > 0, ZeroAmountPassed());

        _nftFactoryParameters.signerAddress = _signer;
        _nftFactoryParameters.defaultPaymentCurrency = _paymentCurrency;
        _nftFactoryParameters.transferValidator = _validator;
        _nftFactoryParameters.maxArraySize = _arraySize;

        _setReferralPercentages(percentages);

        emit FactoryParametersSet(
            _signer,
            _paymentCurrency,
            _validator,
            _arraySize
        );
    }

    /**
     * @notice Sets a new platform address and commission.
     * @dev Can only be called by the owner.
     * @param _platformCommission The new platform commission in basis points.
     * @param _platformAddress The new platform address.
     */
    function setPlatformParameters(
        address _platformAddress,
        uint256 _platformCommission
    ) external onlyOwner zeroAddressCheck(_platformAddress) {
        _nftFactoryParameters.platformAddress = _platformAddress;
        _nftFactoryParameters.platformCommission = _platformCommission;

        emit PlatformParametersSet(_platformAddress, _platformCommission);
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
