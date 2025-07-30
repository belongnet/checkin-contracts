// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {LibClone} from "solady/src/utils/LibClone.sol";

import {ReferralSystemV2} from "./extensions/ReferralSystemV2.sol";
import {AccessToken} from "../tokens/AccessToken.sol";
import {CreditToken} from "../tokens/CreditToken.sol";
import {RoyaltiesReceiverV2} from "../periphery/RoyaltiesReceiverV2.sol";
import {SignatureVerifier} from "../utils/SignatureVerifier.sol";
import {AccessTokenInfo, Metadata, ERC1155Info} from "../Structures.sol";

/**
 * @title NFT Factory Contract
 * @notice A factory contract to create new NFT instances with specific parameters.
 * @dev This contract allows producing NFTs, managing platform settings, and verifying signatures.
 */
contract Factory is Initializable, Ownable, ReferralSystemV2 {
    using SignatureVerifier for address;
    using LibClone for address;

    // ========== Errors ==========

    /// @notice Error thrown when an NFT with the same name and symbol already exists.
    error TokenAlreadyExists();

    error TotalRoyaltiesExceed100Pecents();

    error RoyaltiesReceiverAddressMismatch();
    error AccessTokenAddressMismatch();

    // ========== Events ==========

    /// @notice Event emitted when a new NFT is created.
    /// @param _hash The keccak256 hash of the NFT's name and symbol.
    /// @param info The information about the created NFT instance.
    event NFTCreated(bytes32 indexed _hash, AccessTokenInstanceInfo info);

    event CreditTokenCreated(
        bytes32 indexed _hash,
        CreditTokenInstanceInfo info
    );

    /// @notice Event emitted when the new factory parameters set.

    event FactoryParametersSet(
        FactoryParameters factoryParameters,
        RoyaltiesParameters royalties,
        Implementations implementations
    );

    /**
     * @title NftFactoryParameters
     * @notice A struct that contains parameters related to the NFT factory, such as platform and commission details.
     * @dev This struct is used to store key configuration information for the NFT factory.
     */
    struct FactoryParameters {
        /// @notice The platform address that is allowed to collect fees.
        address feeCollector;
        /// @notice The address of the signer used for signature verification.
        address signer;
        /// @notice The address of the default payment currency.
        address defaultPaymentToken;
        /// @notice The platform commission in basis points (BPs).
        uint256 commissionInBps;
        /// @notice The maximum size of an array allowed in batch operations.
        uint256 maxArraySize;
        /// @notice The address of the contract used to validate token transfers.
        address transferValidator;
    }

    /**
     * @title NftInstanceInfo
     * @notice A simplified struct that holds only the basic information of the NFT collection, such as name, symbol, and creator.
     * @dev This struct is used for lightweight storage of NFT collection metadata.
     */
    struct AccessTokenInstanceInfo {
        /// @notice The address of the creator of the NFT collection.
        address creator;
        /// @notice The address of the NFT contract instance.
        address accessToken;
        /// @notice The address of the Royalties Receiver contract instance.
        address royaltiesReceiver;
        Metadata metadata;
    }

    struct CreditTokenInstanceInfo {
        /// @notice The address of the creator of the NFT collection.
        address creator;
        /// @notice The address of the NFT contract instance.
        address creditToken;
        Metadata metadata;
    }

    struct RoyaltiesParameters {
        uint16 amountToCreator;
        uint16 amountToPlatform;
    }

    struct Implementations {
        address accessToken;
        address creditToken;
        address royaltiesReceiver;
    }

    // ========== State Variables ==========

    /// @notice A struct that contains the NFT factory parameters.
    FactoryParameters private _factoryParameters;

    /// @notice A mapping from keccak256(name, symbol) to the NFT instance address.
    mapping(bytes32 hashedNameSymbol => AccessTokenInstanceInfo info)
        private _accessTokenInstanceInfo;

    mapping(bytes32 hashedNameSymbol => CreditTokenInstanceInfo info)
        private _creditTokenInstanceInfo;

    RoyaltiesParameters private _royaltiesParameters;

    Implementations private _currentImplementations;

    // ========== Functions ==========

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with NFT factory parameters and referral percentages.

     */
    function initialize(
        FactoryParameters calldata factoryParameters,
        RoyaltiesParameters calldata _royalties,
        Implementations calldata _implementations,
        uint16[5] calldata percentages
    ) external initializer {
        _setFactoryParameters(factoryParameters, _royalties, _implementations);

        _setReferralParameters(percentages);

        _initializeOwner(msg.sender);
    }

    // function upgradeToV2(
    //     RoyaltiesParameters calldata _royalties,
    //     Implementations calldata _implementations
    // ) external reinitializer(2) {
    //     _setRoyalties(_royalties);
    //     _setImplementations(_implementations);
    // }

    /**
     * @notice Produces a new NFT i nstance.
     * @dev Creates a new instance of the NFT and adds the information to the storage contract.


     */
    function produce(
        AccessTokenInfo memory accessTokenInfo,
        bytes32 referralCode
    ) external returns (address accessToken) {
        FactoryParameters memory factoryParameters = _factoryParameters;

        factoryParameters.signer.checkAccessTokenInfo(accessTokenInfo);

        bytes32 hashedSalt = _metadataHash(
            accessTokenInfo.metadata.name,
            accessTokenInfo.metadata.symbol
        );

        require(
            _accessTokenInstanceInfo[hashedSalt].accessToken == address(0),
            TokenAlreadyExists()
        );

        accessTokenInfo.paymentToken = accessTokenInfo.paymentToken ==
            address(0)
            ? factoryParameters.defaultPaymentToken
            : accessTokenInfo.paymentToken;

        Implementations memory currentImplementations = _currentImplementations;

        address predictedRoyaltiesReceiver = currentImplementations
            .royaltiesReceiver
            .predictDeterministicAddress(hashedSalt, address(this));
        address predictedAccessToken = currentImplementations
            .accessToken
            .predictDeterministicAddressERC1967(hashedSalt, address(this));

        address receiver;
        _setReferralUser(referralCode, msg.sender);
        if (accessTokenInfo.feeNumerator > 0) {
            receiver = currentImplementations
                .royaltiesReceiver
                .cloneDeterministic(hashedSalt);
            require(
                predictedRoyaltiesReceiver == receiver,
                RoyaltiesReceiverAddressMismatch()
            );
            RoyaltiesReceiverV2(payable(receiver)).initialize(
                RoyaltiesReceiverV2.RoyaltiesReceivers(
                    msg.sender,
                    factoryParameters.feeCollector,
                    referrals[referralCode].creator
                ),
                Factory(address(this)),
                referralCode
            );
        }

        accessToken = currentImplementations
            .accessToken
            .deployDeterministicERC1967(hashedSalt);
        require(
            predictedAccessToken == accessToken,
            AccessTokenAddressMismatch()
        );
        AccessToken(accessToken).initialize(
            AccessToken.AccessTokenParameters({
                factory: Factory(address(this)),
                info: accessTokenInfo,
                creator: msg.sender,
                feeReceiver: receiver,
                referralCode: referralCode
            }),
            factoryParameters.transferValidator
        );

        AccessTokenInstanceInfo
            memory accessTokenInstanceInfo = AccessTokenInstanceInfo({
                creator: msg.sender,
                accessToken: accessToken,
                metadata: accessTokenInfo.metadata,
                royaltiesReceiver: receiver
            });

        _accessTokenInstanceInfo[hashedSalt] = accessTokenInstanceInfo;

        emit NFTCreated(hashedSalt, accessTokenInstanceInfo);
    }

    function produceCreditToken(
        ERC1155Info calldata creditTokenInfo,
        bytes calldata signature
    ) external returns (address creditToken) {
        _factoryParameters.signer.checkCreditTokenInfo(
            signature,
            creditTokenInfo
        );

        bytes32 saltHash = _metadataHash(
            creditTokenInfo.name,
            creditTokenInfo.symbol
        );

        require(
            _creditTokenInstanceInfo[saltHash].creditToken == address(0),
            TokenAlreadyExists()
        );

        creditToken = LibClone.cloneDeterministic(
            _currentImplementations.creditToken,
            saltHash
        );
        CreditToken(creditToken).initialize(creditTokenInfo);

        CreditTokenInstanceInfo
            memory creditTokenInstanceInfo = CreditTokenInstanceInfo({
                creator: msg.sender,
                creditToken: creditToken,
                metadata: Metadata({
                    name: creditTokenInfo.name,
                    symbol: creditTokenInfo.symbol
                })
            });

        _creditTokenInstanceInfo[saltHash] = creditTokenInstanceInfo;

        emit CreditTokenCreated(saltHash, creditTokenInstanceInfo);
    }

    /**
     * @notice Sets new factory parameters.
     * @dev Can only be called by the owner (BE).

     */
    function setFactoryParameters(
        FactoryParameters calldata factoryParameters_,
        RoyaltiesParameters calldata _royalties,
        Implementations calldata _implementations,
        uint16[5] calldata percentages
    ) external onlyOwner {
        _setFactoryParameters(factoryParameters_, _royalties, _implementations);
        _setReferralParameters(percentages);
    }

    /// @notice Returns the current NFT factory parameters.
    /// @return The NFT factory parameters.
    function nftFactoryParameters()
        external
        view
        returns (FactoryParameters memory)
    {
        return _factoryParameters;
    }

    function royaltiesParameters()
        external
        view
        returns (RoyaltiesParameters memory)
    {
        return _royaltiesParameters;
    }

    function implementations() external view returns (Implementations memory) {
        return _currentImplementations;
    }

    function getNftInstanceInfo(
        string calldata name,
        string calldata symbol
    ) external view returns (AccessTokenInstanceInfo memory) {
        return _accessTokenInstanceInfo[_metadataHash(name, symbol)];
    }

    function getCreditTokenInstanceInfo(
        string calldata name,
        string calldata symbol
    ) external view returns (CreditTokenInstanceInfo memory) {
        return _creditTokenInstanceInfo[_metadataHash(name, symbol)];
    }
    function _setFactoryParameters(
        FactoryParameters calldata factoryParameters_,
        RoyaltiesParameters calldata _royalties,
        Implementations calldata _implementations
    ) private {
        require(
            _royalties.amountToCreator + _royalties.amountToPlatform <= 10000,
            TotalRoyaltiesExceed100Pecents()
        );

        _factoryParameters = factoryParameters_;
        _royaltiesParameters = _royalties;
        _currentImplementations = _implementations;

        emit FactoryParametersSet(
            factoryParameters_,
            _royalties,
            _implementations
        );
    }

    function _metadataHash(
        string memory name,
        string memory symbol
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(name, symbol));
    }
}
