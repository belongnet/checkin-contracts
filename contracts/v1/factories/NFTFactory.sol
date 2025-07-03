// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";

import {ReferralSystem} from "./utils/ReferralSystem.sol";
import {NFT, NftParameters} from "../NFT.sol";
import {RoyaltiesReceiver} from "../RoyaltiesReceiver.sol";
import {InvalidSignature} from "./../Structures.sol";

// ========== Errors ==========

/// @notice Error thrown when an NFT with the same name and symbol already exists.
error NFTAlreadyExists();

/**
 * @title NftFactoryParameters
 * @notice A struct that contains parameters related to the NFT factory, such as platform and commission details.
 * @dev This struct is used to store key configuration information for the NFT factory.
 */
struct NftFactoryParameters {
    /// @notice The platform address that is allowed to collect fees.
    address platformAddress;
    /// @notice The address of the signer used for signature verification.
    address signerAddress;
    /// @notice The address of the default payment currency.
    address defaultPaymentCurrency;
    /// @notice The platform commission in basis points (BPs).
    uint256 platformCommission;
    /// @notice The maximum size of an array allowed in batch operations.
    uint256 maxArraySize;
    /// @notice The address of the contract used to validate token transfers.
    address transferValidator;
}

struct NftMetadata {
    /// @notice The name of the NFT collection.
    string name;
    /// @notice The symbol representing the NFT collection.
    string symbol;
}

/**
 * @title InstanceInfo
 * @notice A struct that holds detailed information about an individual NFT collection, such as name, symbol, and pricing.
 * @dev This struct is used to store key metadata and configuration information for each NFT collection.
 */
struct InstanceInfo {
    /// @notice The address of the ERC20 token used for payments, or ETH (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) for Ether.
    address payingToken;
    /// @notice The royalty fraction for platform and creator royalties, expressed as a numerator.
    uint96 feeNumerator;
    /// @notice A boolean flag indicating whether the tokens in the collection are transferable.
    bool transferable;
    /// @notice The maximum total supply of tokens in the collection.
    uint256 maxTotalSupply;
    /// @notice The price to mint a token in the collection.
    uint256 mintPrice;
    /// @notice The price to mint a token for whitelisted users in the collection.
    uint256 whitelistMintPrice;
    /// @notice The expiration time (as a timestamp) for the collection.
    uint256 collectionExpire;
    NftMetadata metadata;
    /// @notice The contract URI for the NFT collection, used for metadata.
    string contractURI;
    /// @notice A signature provided by the backend to validate the creation of the collection.
    bytes signature;
}

/**
 * @title NftInstanceInfo
 * @notice A simplified struct that holds only the basic information of the NFT collection, such as name, symbol, and creator.
 * @dev This struct is used for lightweight storage of NFT collection metadata.
 */
struct NftInstanceInfo {
    /// @notice The address of the creator of the NFT collection.
    address creator;
    /// @notice The address of the NFT contract instance.
    address nftAddress;
    /// @notice The address of the Royalties Receiver contract instance.
    address royaltiesReceiver;
    NftMetadata metadata;
}

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
    /// @param nftFactoryParameters The NFT factory parameters to be set.
    /// @param percentages The referral percentages for the system.
    event FactoryParametersSet(
        NftFactoryParameters nftFactoryParameters,
        uint16[5] percentages
    );

    // ========== State Variables ==========

    /// @notice A struct that contains the NFT factory parameters.
    NftFactoryParameters private _nftFactoryParameters;

    /// @notice A mapping from keccak256(name, symbol) to the NFT instance address.
    mapping(bytes32 => NftInstanceInfo) public getNftInstanceInfo;

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
        uint16[5] calldata percentages
    ) external initializer {
        _nftFactoryParameters = nftFactoryParameters_;
        _setReferralPercentages(percentages);

        _initializeOwner(msg.sender);
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

        address receiver;

        _setReferralUser(referralCode, msg.sender);
        if (_info.feeNumerator > 0) {
            address referral = getReferralCreator(referralCode);

            receiver = address(
                new RoyaltiesReceiver(
                    referralCode,
                    [msg.sender, params.platformAddress, referral]
                )
            );
        }

        nftAddress = address(
            new NFT(
                NftParameters({
                    transferValidator: params.transferValidator,
                    factory: address(this),
                    info: _info,
                    creator: msg.sender,
                    feeReceiver: receiver,
                    referralCode: referralCode
                })
            )
        );

        NftInstanceInfo memory info = NftInstanceInfo({
            creator: msg.sender,
            nftAddress: nftAddress,
            metadata: _info.metadata,
            royaltiesReceiver: receiver
        });

        getNftInstanceInfo[_hash] = info;

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
