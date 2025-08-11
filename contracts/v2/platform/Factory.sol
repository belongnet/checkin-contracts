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
import {AccessTokenInfo, ERC1155Info} from "../Structures.sol";

/// @title NFT Factory Contract
/// @notice Produces upgradeable ERC721-like AccessToken collections and minimal-proxy ERC1155 CreditToken collections,
///         configures royalties receivers, and manages platform referral parameters.
/// @dev
/// - Uses Solady's `LibClone` for CREATE2 deterministic deployments and ERC1967 proxy deployments.
/// - Signature-gated creation flows validated by a platform signer (see {FactoryParameters.signer}).
/// - Royalties split (creator/platform/referral) configured via `RoyaltiesReceiverV2`.
/// - Referral configuration inherited from {ReferralSystemV2}.
contract Factory is Initializable, Ownable, ReferralSystemV2 {
    using SignatureVerifier for address;
    using LibClone for address;

    // ========== Errors ==========

    /// @notice Thrown when a collection with the same `(name, symbol)` already exists.
    error TokenAlreadyExists();

    /// @notice Thrown when `amountToCreator + amountToPlatform > 10000` (i.e., >100% in BPS).
    error TotalRoyaltiesExceed100Pecents();

    /// @notice Thrown when the deployed royalties receiver address does not match the predicted CREATE2 address.
    error RoyaltiesReceiverAddressMismatch();

    /// @notice Thrown when the deployed AccessToken proxy address does not match the predicted address.
    error AccessTokenAddressMismatch();

    /// @notice Thrown when the deployed CreditToken address does not match the predicted address.
    error CreditTokenAddressMismatch();

    // ========== Events ==========

    /// @notice Emitted after successful creation of an AccessToken collection.
    /// @param _hash Keccak256 hash of `(name, symbol)`.
    /// @param info Deployed collection details.
    event AccessTokenCreated(
        bytes32 indexed _hash,
        AccessTokenInstanceInfo info
    );

    /// @notice Emitted after successful creation of a CreditToken collection.
    /// @param _hash Keccak256 hash of `(name, symbol)`.
    /// @param info Deployed collection details.
    event CreditTokenCreated(
        bytes32 indexed _hash,
        CreditTokenInstanceInfo info
    );

    /// @notice Emitted when factory/global parameters are updated.
    /// @param factoryParameters New factory parameters.
    /// @param royalties New royalties parameters (creator/platform BPS).
    /// @param implementations Addresses for implementation contracts.
    event FactoryParametersSet(
        FactoryParameters factoryParameters,
        RoyaltiesParameters royalties,
        Implementations implementations
    );

    // ========== Types ==========

    /// @notice Global configuration for the Factory.
    /// @dev `commissionInBps` is expressed in basis points (BPS), where 10_000 == 100%.
    struct FactoryParameters {
        /// @notice Address that collects platform fees/commissions.
        address feeCollector;
        /// @notice EOA/contract whose signature authorizes creation requests.
        address signer;
        /// @notice Default payment token used when none specified by caller.
        address defaultPaymentToken;
        /// @notice Platform commission in BPS.
        uint256 commissionInBps;
        /// @notice Maximum permissible array length for batched operations (guardrail).
        uint256 maxArraySize;
        /// @notice Transfer validator contract address injected into AccessToken instances.
        address transferValidator;
    }

    /// @notice Summary information about a deployed AccessToken collection.
    struct AccessTokenInstanceInfo {
        /// @notice Creator address for the collection.
        address creator;
        /// @notice Deployed AccessToken proxy address.
        address accessToken;
        /// @notice Deployed RoyaltiesReceiver address (or zero if feeNumerator == 0).
        address royaltiesReceiver;
        /// @notice Collection name.
        string name;
        /// @notice Collection symbol.
        string symbol;
    }

    /// @notice Summary information about a deployed CreditToken collection.
    struct CreditTokenInstanceInfo {
        /// @notice Default admin role holder.
        address defaultAdmin;
        /// @notice Manager role holder.
        address manager;
        /// @notice Minter role holder.
        address minter;
        /// @notice Burner role holder.
        address burner;
        /// @notice Deployed CreditToken (minimal proxy) address.
        address creditToken;
        /// @notice Collection name.
        string name;
        /// @notice Collection symbol.
        string symbol;
    }

    /// @notice Royalties split configuration for secondary sales.
    /// @dev Values are in BPS (10_000 == 100%). Sum must not exceed 10_000.
    struct RoyaltiesParameters {
        uint16 amountToCreator;
        uint16 amountToPlatform;
    }

    /// @notice Implementation contract addresses used for deployments.
    /// @dev
    /// - `accessToken` is an ERC1967 implementation for proxy deployments (Upgradeable).
    /// - `creditToken` and `royaltiesReceiver` are minimal-proxy (clone) targets.
    struct Implementations {
        address accessToken;
        address creditToken;
        address royaltiesReceiver;
    }

    // ========== Storage ==========

    /// @notice Current factory parameters.
    FactoryParameters private _factoryParameters;

    /// @notice Mapping `(name, symbol)` hash → AccessToken collection info.
    mapping(bytes32 hashedNameSymbol => AccessTokenInstanceInfo info)
        private _accessTokenInstanceInfo;

    /// @notice Mapping `(name, symbol)` hash → CreditToken collection info.
    mapping(bytes32 hashedNameSymbol => CreditTokenInstanceInfo info)
        private _creditTokenInstanceInfo;

    /// @notice Current royalties split parameters.
    RoyaltiesParameters private _royaltiesParameters;

    /// @notice Current implementation addresses used by the factory.
    Implementations private _currentImplementations;

    // ========== Initialization ==========

    /// @notice Disable initializers on the implementation.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes factory settings and referral parameters; sets the initial owner.
    /// @dev Must be called exactly once on the proxy instance.
    /// @param factoryParameters Factory parameters (fee collector, signer, defaults, etc.).
    /// @param _royalties Royalties split (creator/platform) in BPS.
    /// @param _implementations Implementation addresses for deployments.
    /// @param percentages Referral percentages array forwarded to {ReferralSystemV2}.
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

    // ========== Creation Flows ==========

    /// @notice Produces a new AccessToken collection (upgradeable proxy) and optional RoyaltiesReceiver.
    /// @dev
    /// - Validates `accessTokenInfo` via platform signer (EIP-712/ECDSA inside `SignatureVerifier`).
    /// - Deterministic salt is `keccak256(name, symbol)`. Creation fails if the salt already exists.
    /// - If `feeNumerator > 0`, deploys a RoyaltiesReceiver and wires creator/platform/referral receivers.
    /// - Uses `deployDeterministicERC1967` for AccessToken proxy and `cloneDeterministic` for royalties receiver.
    /// @param accessTokenInfo Parameters used to initialize the AccessToken instance.
    /// @param referralCode Optional referral code attributed to the creator.
    /// @return accessToken The deployed AccessToken proxy address.
    function produce(
        AccessTokenInfo memory accessTokenInfo,
        bytes32 referralCode
    ) external returns (address accessToken) {
        FactoryParameters memory factoryParameters = _factoryParameters;

        factoryParameters.signer.checkAccessTokenInfo(accessTokenInfo);

        bytes32 hashedSalt = _metadataHash(
            accessTokenInfo.name,
            accessTokenInfo.symbol
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
                royaltiesReceiver: receiver,
                name: accessTokenInfo.name,
                symbol: accessTokenInfo.symbol
            });

        _accessTokenInstanceInfo[hashedSalt] = accessTokenInstanceInfo;

        emit AccessTokenCreated(hashedSalt, accessTokenInstanceInfo);
    }

    /// @notice Produces a new CreditToken (ERC1155) collection as a minimal proxy clone.
    /// @dev
    /// - Validates `creditTokenInfo` via platform signer and provided `signature`.
    /// - Deterministic salt is `keccak256(name, symbol)`. Creation fails if the salt already exists.
    /// - Uses `cloneDeterministic` and then initializes the cloned instance.
    /// @param creditTokenInfo Parameters to initialize the CreditToken instance.
    /// @param signature Authorization signature from the platform signer.
    /// @return creditToken The deployed CreditToken clone address.
    function produceCreditToken(
        ERC1155Info calldata creditTokenInfo,
        bytes calldata signature
    ) external returns (address creditToken) {
        _factoryParameters.signer.checkCreditTokenInfo(
            signature,
            creditTokenInfo
        );

        bytes32 hashedSalt = _metadataHash(
            creditTokenInfo.name,
            creditTokenInfo.symbol
        );

        require(
            _creditTokenInstanceInfo[hashedSalt].creditToken == address(0),
            TokenAlreadyExists()
        );

        address creditTokenImplementation = _currentImplementations.creditToken;
        address predictedCreditToken = creditTokenImplementation
            .predictDeterministicAddress(hashedSalt, address(this));

        creditToken = creditTokenImplementation.cloneDeterministic(hashedSalt);
        require(
            predictedCreditToken == creditToken,
            CreditTokenAddressMismatch()
        );
        CreditToken(creditToken).initialize(creditTokenInfo);

        CreditTokenInstanceInfo
            memory creditTokenInstanceInfo = CreditTokenInstanceInfo({
                defaultAdmin: creditTokenInfo.defaultAdmin,
                manager: creditTokenInfo.manager,
                minter: creditTokenInfo.minter,
                burner: creditTokenInfo.burner,
                creditToken: creditToken,
                name: creditTokenInfo.name,
                symbol: creditTokenInfo.symbol
            });

        _creditTokenInstanceInfo[hashedSalt] = creditTokenInstanceInfo;

        emit CreditTokenCreated(hashedSalt, creditTokenInstanceInfo);
    }

    // ========== Admin ==========

    /// @notice Updates factory parameters, royalties, implementations, and referral percentages.
    /// @dev Only callable by the owner (backend/admin).
    /// @param factoryParameters_ New factory parameters.
    /// @param _royalties New royalties parameters (BPS).
    /// @param _implementations New implementation addresses.
    /// @param percentages Referral percentages propagated to {ReferralSystemV2}.
    function setFactoryParameters(
        FactoryParameters calldata factoryParameters_,
        RoyaltiesParameters calldata _royalties,
        Implementations calldata _implementations,
        uint16[5] calldata percentages
    ) external onlyOwner {
        _setFactoryParameters(factoryParameters_, _royalties, _implementations);
        _setReferralParameters(percentages);
    }

    // ========== Views ==========

    /// @notice Returns the current factory parameters.
    /// @return The {FactoryParameters} struct.
    function nftFactoryParameters()
        external
        view
        returns (FactoryParameters memory)
    {
        return _factoryParameters;
    }

    /// @notice Returns the current royalties parameters (BPS).
    /// @return The {RoyaltiesParameters} struct.
    function royaltiesParameters()
        external
        view
        returns (RoyaltiesParameters memory)
    {
        return _royaltiesParameters;
    }

    /// @notice Returns the current implementation addresses used for deployments.
    /// @return The {Implementations} struct.
    function implementations() external view returns (Implementations memory) {
        return _currentImplementations;
    }

    /// @notice Returns stored info for an AccessToken collection by `(name, symbol)`.
    /// @param name Collection name.
    /// @param symbol Collection symbol.
    /// @return The {AccessTokenInstanceInfo} record, if created.
    function getNftInstanceInfo(
        string calldata name,
        string calldata symbol
    ) external view returns (AccessTokenInstanceInfo memory) {
        return _accessTokenInstanceInfo[_metadataHash(name, symbol)];
    }

    /// @notice Returns stored info for a CreditToken collection by `(name, symbol)`.
    /// @param name Collection name.
    /// @param symbol Collection symbol.
    /// @return The {CreditTokenInstanceInfo} record, if created.
    function getCreditTokenInstanceInfo(
        string calldata name,
        string calldata symbol
    ) external view returns (CreditTokenInstanceInfo memory) {
        return _creditTokenInstanceInfo[_metadataHash(name, symbol)];
    }

    // ========== Internal ==========

    /// @notice Internal helper to atomically set factory, royalties, and implementation parameters.
    /// @dev Reverts if royalties sum exceeds 100% (10_000 BPS).
    /// @param factoryParameters_ New factory parameters.
    /// @param _royalties New royalties parameters (BPS).
    /// @param _implementations New implementation addresses.
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

    /// @notice Computes a deterministic salt for a collection metadata pair.
    /// @param name Collection name.
    /// @param symbol Collection symbol.
    /// @return Hash salt equal to `keccak256(abi.encodePacked(name, symbol))`.
    function _metadataHash(
        string memory name,
        string memory symbol
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(name, symbol));
    }
}
