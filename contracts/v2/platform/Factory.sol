// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {LibClone} from "solady/src/utils/LibClone.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

import {ReferralSystemV2} from "./extensions/ReferralSystemV2.sol";
import {AccessToken} from "../tokens/AccessToken.sol";
import {CreditToken} from "../tokens/CreditToken.sol";
import {RoyaltiesReceiverV2} from "../periphery/RoyaltiesReceiverV2.sol";
import {VestingWalletExtended} from "../periphery/VestingWalletExtended.sol";
import {SignatureVerifier} from "../utils/SignatureVerifier.sol";
import {AccessTokenInfo, NftMetadata, ERC1155Info, VestingWalletInfo} from "../Structures.sol";

/// @notice Summary information about a deployed AccessToken collection.
struct NftInstanceInfo {
    /// @notice Creator address for the collection.
    address creator;
    /// @notice Deployed AccessToken proxy address.
    address nftAddress;
    /// @notice Deployed RoyaltiesReceiver address (or zero if feeNumerator == 0).
    address royaltiesReceiver;
    /// @notice Collection name and symbol stored as NftMetadata struct.
    NftMetadata metadata;
}

/// @title NFT Factory Contract
/// @notice Produces upgradeable ERC721-like AccessToken collections, minimal-proxy ERC1155 CreditToken collections, and
///         vesting wallets while configuring royalties receivers and referral parameters for the Belong platform.
/// @dev
/// - Uses Solady's `LibClone` helpers for deterministic CREATE2 deployments and ERC1967 proxies.
/// - Creation flows are gated by signatures produced by `FactoryParameters.signerAddress` (see {SignatureVerifier}).
/// - Royalties are split between creator/platform/referral receivers via {RoyaltiesReceiverV2}.
/// - Referral percentages and bookkeeping stem from {ReferralSystemV2}.
contract Factory is Initializable, Ownable, ReferralSystemV2 {
    using SignatureVerifier for address;
    using LibClone for address;
    using SafeTransferLib for address;

    // ========== Errors ==========

    /// @notice Thrown when a collection with the same `(name, symbol)` already exists.
    error TokenAlreadyExists();

    /// @notice Thrown when a beneficiary already has a vesting wallet registered.
    error VestingWalletAlreadyExists();

    /// @notice Thrown when `amountToCreator + amountToPlatform != 10000`.
    error TotalRoyaltiesNot100Percent();

    /// @notice Thrown when the deployed royalties receiver address does not match the predicted CREATE2 address.
    error RoyaltiesReceiverAddressMismatch();

    /// @notice Thrown when the deployed AccessToken proxy address does not match the predicted address.
    error AccessTokenAddressMismatch();

    /// @notice Thrown when the deployed CreditToken address does not match the predicted address.
    error CreditTokenAddressMismatch();

    /// @notice Thrown when the deployed VestingWallet proxy address does not match the predicted address.
    error VestingWalletAddressMismatch();

    /// @notice Thrown when the caller does not hold enough tokens to fully fund the vesting wallet.
    error NotEnoughFundsToVest();

    /// @notice Invalid combination of `durationSeconds` and `cliffDurationSeconds`.
    /// @param duration Provided linear duration in seconds.
    /// @param cliff Provided cliff duration in seconds.
    error BadDurations(uint64 duration, uint64 cliff);
    /// @notice Current allocation sum does not fit under `totalAllocation`.
    /// @param total Provided total allocation.
    error AllocationMismatch(uint256 total);

    // ========== Events ==========

    /// @notice Emitted after successful creation of an AccessToken collection.
    /// @param _hash Keccak256 hash of `(name, symbol)`.
    /// @param info Deployed collection details.
    event AccessTokenCreated(bytes32 indexed _hash, NftInstanceInfo info);

    /// @notice Emitted after successful creation of a CreditToken collection.
    /// @param _hash Keccak256 hash of `(name, symbol)`.
    /// @param info Deployed collection details.
    event CreditTokenCreated(bytes32 indexed _hash, CreditTokenInstanceInfo info);

    /// @notice Emitted after successful deployment and funding of a VestingWallet.
    /// @param _hash Keccak256 hash of `(beneficiary, walletIndex)` used as deterministic salt.
    /// @param info Deployed vesting details.
    event VestingWalletCreated(bytes32 indexed _hash, VestingWalletInstanceInfo info);

    /// @notice Emitted when factory/global parameters are updated.
    /// @param factoryParameters New factory parameters.
    /// @param royalties New royalties parameters (creator/platform BPS).
    /// @param implementations Addresses for implementation contracts.
    event FactoryParametersSet(
        FactoryParameters factoryParameters, RoyaltiesParameters royalties, Implementations implementations
    );

    // ========== Types ==========

    /// @notice Global configuration knobs consumed by factory deployments and downstream contracts.
    /// @dev `platformCommission` is expressed in basis points (BPS), where 10_000 == 100%.
    struct FactoryParameters {
        /// @notice Address that collects platform fees/commissions.
        address platformAddress;
        /// @notice EOA/contract whose signature authorizes creation requests.
        address signerAddress;
        /// @notice Default payment token used when none specified by caller.
        address defaultPaymentCurrency;
        /// @notice Platform commission in BPS.
        uint256 platformCommission;
        /// @notice Maximum permissible array length for batched operations (guardrail).
        uint256 maxArraySize;
        /// @notice Transfer validator contract address injected into AccessToken instances.
        address transferValidator;
    }

    /// @notice Summary information about a deployed CreditToken collection.
    struct CreditTokenInstanceInfo {
        /// @notice Deployed CreditToken (minimal proxy) address.
        address creditToken;
        /// @notice Collection name.
        string name;
        /// @notice Collection symbol.
        string symbol;
    }

    struct VestingWalletInstanceInfo {
        /// @notice Vesting start timestamp (TGE).
        uint64 startTimestamp;
        /// @notice Cliff duration in seconds (linear section begins at `start + cliff`).
        uint64 cliffDurationSeconds;
        /// @notice Linear vesting duration in seconds counted from `cliff`.
        uint64 durationSeconds;
        /// @notice ERC-20 token vested by this wallet.
        address token;
        /// @notice Deployed VestingWallet (ERC1967 proxy) address.
        address vestingWallet;
        /// @notice Human-readable description supplied by the backend for off-chain bookkeeping.
        string description;
    }

    /// @notice Royalties split configuration for secondary sales.
    /// @dev Values are in BPS (10_000 == 100%). Sum must not exceed 10_000.
    struct RoyaltiesParameters {
        uint16 amountToCreator;
        uint16 amountToPlatform;
    }

    /// @notice Implementation contract addresses used for deployments.
    /// @dev
    /// - `nftAddress` is an ERC1967 implementation for proxy deployments (Upgradeable).
    /// - `creditToken` and `royaltiesReceiver` are minimal-proxy (clone) targets.
    struct Implementations {
        address accessToken;
        address creditToken;
        address royaltiesReceiver;
        address vestingWallet;
    }

    // ========== Storage ==========

    /// @notice Current factory parameters.
    FactoryParameters private _nftFactoryParameters;

    /// @notice Mapping `(name, symbol)` hash → AccessToken collection info.
    mapping(bytes32 hashedNameSymbol => NftInstanceInfo info) public getNftInstanceInfo;

    /// @notice Mapping `(name, symbol)` hash → CreditToken collection info.
    mapping(bytes32 hashedNameSymbol => CreditTokenInstanceInfo info) private _creditTokenInstanceInfo;

    /// @notice Mapping `beneficiary` → list of vesting wallets deployed for that beneficiary.
    mapping(address beneficiary => VestingWalletInstanceInfo[] infos) private _vestingWalletInstanceInfos;

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

    /// @notice Upgrades stored royalties parameters and implementation addresses (reinitializer v2).
    /// @param _royalties New royalties parameters (BPS).
    /// @param _implementations New implementation addresses.
    function upgradeToV2(RoyaltiesParameters calldata _royalties, Implementations calldata _implementations)
        external
        reinitializer(2)
    {
        _setFactoryParameters(_nftFactoryParameters, _royalties, _implementations);
    }

    // ========== Creation Flows ==========

    /// @notice Produces a new AccessToken collection (upgradeable proxy) and optional RoyaltiesReceiver.
    /// @dev
    /// - Validates `accessTokenInfo` via platform signer (EIP-712/ECDSA inside `SignatureVerifier`).
    /// - Deterministic salt is `keccak256(name, symbol)`. Creation fails if the salt already exists.
    /// - If `feeNumerator > 0`, deploys a RoyaltiesReceiver and wires creator/platform/referral receivers.
    /// - Uses `deployDeterministicERC1967` for AccessToken proxy and `cloneDeterministic` for royalties receiver.
    /// @param accessTokenInfo Parameters used to initialize the AccessToken instance.
    /// @param referralCode Optional referral code attributed to the creator.
    /// @return nftAddress The deployed AccessToken proxy address.
    function produce(
        AccessTokenInfo memory accessTokenInfo,
        bytes32 referralCode,
        SignatureVerifier.SignatureProtection calldata protection
    ) external returns (address nftAddress, address receiver) {
        FactoryParameters storage factoryParameters = _nftFactoryParameters;

        factoryParameters.signerAddress.checkAccessTokenInfo(address(this), protection, accessTokenInfo);

        bytes32 hashedSalt =
            _getHash(abi.encode(accessTokenInfo.metadata.name), abi.encode(accessTokenInfo.metadata.symbol));

        NftInstanceInfo storage atInfo = getNftInstanceInfo[hashedSalt];
        require(atInfo.nftAddress == address(0), TokenAlreadyExists());

        accessTokenInfo.paymentToken = accessTokenInfo.paymentToken == address(0)
            ? factoryParameters.defaultPaymentCurrency
            : accessTokenInfo.paymentToken;

        Implementations storage currentImplementations = _currentImplementations;

        address predictedRoyaltiesReceiver =
            currentImplementations.royaltiesReceiver.predictDeterministicAddress(hashedSalt, address(this));
        address predictedAccessToken =
            currentImplementations.accessToken.predictDeterministicAddressERC1967(hashedSalt, address(this));

        _setReferralUser(referralCode, accessTokenInfo.creator);
        if (accessTokenInfo.feeNumerator > 0) {
            receiver = currentImplementations.royaltiesReceiver.cloneDeterministic(hashedSalt);
            require(predictedRoyaltiesReceiver == receiver, RoyaltiesReceiverAddressMismatch());
            RoyaltiesReceiverV2(payable(receiver))
                .initialize(
                    RoyaltiesReceiverV2.RoyaltiesReceivers(
                        accessTokenInfo.creator, factoryParameters.platformAddress, referrals[referralCode].creator
                    ),
                    Factory(address(this)),
                    referralCode
                );
        }

        nftAddress = currentImplementations.accessToken.deployDeterministicERC1967(hashedSalt);
        require(predictedAccessToken == nftAddress, AccessTokenAddressMismatch());
        AccessToken(nftAddress)
            .initialize(
                AccessToken.AccessTokenParameters({
                    factory: Factory(address(this)),
                    info: accessTokenInfo,
                    feeReceiver: receiver,
                    referralCode: referralCode
                }),
                factoryParameters.transferValidator
            );

        atInfo.creator = accessTokenInfo.creator;
        atInfo.nftAddress = nftAddress;
        atInfo.royaltiesReceiver = receiver;
        atInfo.metadata = NftMetadata({name: accessTokenInfo.metadata.name, symbol: accessTokenInfo.metadata.symbol});

        emit AccessTokenCreated(hashedSalt, atInfo);
    }

    /// @notice Produces a new CreditToken (ERC1155) collection as a minimal proxy clone.
    /// @dev
    /// - Validates `creditTokenInfo` via platform signer and provided `signature`.
    /// - Deterministic salt is `keccak256(name, symbol)`. Creation fails if the salt already exists.
    /// - Uses `cloneDeterministic` and then initializes the cloned instance.
    /// @param creditTokenInfo Parameters to initialize the CreditToken instance.
    /// @return creditToken The deployed CreditToken clone address.
    function produceCreditToken(
        ERC1155Info calldata creditTokenInfo,
        SignatureVerifier.SignatureProtection calldata protection
    ) external returns (address creditToken) {
        _nftFactoryParameters.signerAddress.checkCreditTokenInfo(address(this), protection, creditTokenInfo);

        bytes32 hashedSalt = _getHash(abi.encode(creditTokenInfo.name), abi.encode(creditTokenInfo.symbol));

        CreditTokenInstanceInfo storage ctInfo = _creditTokenInstanceInfo[hashedSalt];
        require(ctInfo.creditToken == address(0), TokenAlreadyExists());

        address creditTokenImplementation = _currentImplementations.creditToken;
        address predictedCreditToken = creditTokenImplementation.predictDeterministicAddress(hashedSalt, address(this));

        creditToken = creditTokenImplementation.cloneDeterministic(hashedSalt);
        require(predictedCreditToken == creditToken, CreditTokenAddressMismatch());
        CreditToken(creditToken).initialize(creditTokenInfo);

        ctInfo.creditToken = creditToken;
        ctInfo.name = creditTokenInfo.name;
        ctInfo.symbol = creditTokenInfo.symbol;

        emit CreditTokenCreated(hashedSalt, ctInfo);
    }

    /// @notice Deploys and funds a VestingWallet proxy with a validated schedule.
    /// @dev
    /// - Validates signer authorization via {SignatureVerifier.checkVestingWalletInfo}.
    /// - Requires caller to hold at least `totalAllocation` of the vesting token.
    /// - Allows pure step-based vesting when `durationSeconds == 0` and `linearAllocation == 0`.
    /// - Deterministic salt is `keccak256(beneficiary, walletIndex)` where `walletIndex` is the beneficiary's wallet count.
    /// - Transfers `totalAllocation` from caller to the newly deployed vesting wallet.
    /// @param _owner Owner address for the vesting wallet proxy.
    /// @param vestingWalletInfo Full vesting configuration and description.
    /// @return vestingWallet The deployed VestingWallet proxy address.
    function deployVestingWallet(
        address _owner,
        VestingWalletInfo calldata vestingWalletInfo,
        SignatureVerifier.SignatureProtection calldata protection
    ) external returns (address vestingWallet) {
        require(
            vestingWalletInfo.token.balanceOf(msg.sender) >= vestingWalletInfo.totalAllocation, NotEnoughFundsToVest()
        );

        // allow pure step-based (duration=0), or valid cliff+duration
        if (vestingWalletInfo.durationSeconds == 0 && vestingWalletInfo.linearAllocation != 0) {
            revert BadDurations(vestingWalletInfo.durationSeconds, vestingWalletInfo.cliffDurationSeconds);
        }

        // TGE + Linear <= Total (tranches adding later)
        require(
            vestingWalletInfo.tgeAmount + vestingWalletInfo.linearAllocation <= vestingWalletInfo.totalAllocation,
            AllocationMismatch(vestingWalletInfo.totalAllocation)
        );

        _nftFactoryParameters.signerAddress.checkVestingWalletInfo(address(this), protection, _owner, vestingWalletInfo);

        VestingWalletInstanceInfo[] storage vwInfo = _vestingWalletInstanceInfos[vestingWalletInfo.beneficiary];

        bytes32 hashedSalt = _getHash(abi.encode(vestingWalletInfo.beneficiary), abi.encode(vwInfo.length));

        address vestingWalletImplementation = _currentImplementations.vestingWallet;
        address predictedVestingWallet =
            vestingWalletImplementation.predictDeterministicAddressERC1967(hashedSalt, address(this));

        vestingWallet = vestingWalletImplementation.deployDeterministicERC1967(hashedSalt);
        require(predictedVestingWallet == vestingWallet, VestingWalletAddressMismatch());
        VestingWalletExtended(vestingWallet).initialize(_owner, vestingWalletInfo);

        vestingWalletInfo.token.safeTransferFrom(msg.sender, vestingWallet, vestingWalletInfo.totalAllocation);

        VestingWalletInstanceInfo memory vestingWalletInstanceInfo = VestingWalletInstanceInfo({
            startTimestamp: vestingWalletInfo.startTimestamp,
            cliffDurationSeconds: vestingWalletInfo.cliffDurationSeconds,
            durationSeconds: vestingWalletInfo.durationSeconds,
            token: vestingWalletInfo.token,
            vestingWallet: vestingWallet,
            description: vestingWalletInfo.description
        });

        vwInfo.push(vestingWalletInstanceInfo);

        emit VestingWalletCreated(hashedSalt, vestingWalletInstanceInfo);
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
    function nftFactoryParameters() external view returns (FactoryParameters memory) {
        return _nftFactoryParameters;
    }

    /// @notice Returns the current royalties parameters (BPS).
    /// @return The {RoyaltiesParameters} struct.
    function royaltiesParameters() external view returns (RoyaltiesParameters memory) {
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
    /// @return The {NftInstanceInfo} record, if created.
    function nftInstanceInfo(string calldata name, string calldata symbol)
        external
        view
        returns (NftInstanceInfo memory)
    {
        return getNftInstanceInfo[_getHash(abi.encode(name), abi.encode((symbol)))];
    }

    /// @notice Returns stored info for a CreditToken collection by `(name, symbol)`.
    /// @param name Collection name.
    /// @param symbol Collection symbol.
    /// @return The {CreditTokenInstanceInfo} record, if created.
    function getCreditTokenInstanceInfo(string calldata name, string calldata symbol)
        external
        view
        returns (CreditTokenInstanceInfo memory)
    {
        return _creditTokenInstanceInfo[_getHash(abi.encode(name), abi.encode(symbol))];
    }

    /// @notice Returns a vesting wallet record for `beneficiary` at `index`.
    /// @param beneficiary Wallet beneficiary supplied during deployment.
    /// @param index Position inside the beneficiary's vesting wallet array.
    /// @return The {VestingWalletInstanceInfo} record at the requested index.
    function getVestingWalletInstanceInfo(address beneficiary, uint256 index)
        external
        view
        returns (VestingWalletInstanceInfo memory)
    {
        return _vestingWalletInstanceInfos[beneficiary][index];
    }

    /// @notice Returns all vesting wallet records registered for `beneficiary`.
    /// @param beneficiary Wallet beneficiary supplied during deployment.
    /// @return Array of {VestingWalletInstanceInfo} records.
    function getVestingWalletInstanceInfos(address beneficiary)
        external
        view
        returns (VestingWalletInstanceInfo[] memory)
    {
        return _vestingWalletInstanceInfos[beneficiary];
    }

    // ========== Internal ==========

    /// @notice Internal helper to atomically set factory, royalties, and implementation parameters.
    /// @dev Reverts if royalties sum exceeds 100% (10_000 BPS).
    /// @param factoryParameters_ New factory parameters.
    /// @param _royalties New royalties parameters (BPS).
    /// @param _implementations New implementation addresses.
    function _setFactoryParameters(
        FactoryParameters memory factoryParameters_,
        RoyaltiesParameters calldata _royalties,
        Implementations calldata _implementations
    ) private {
        require(_royalties.amountToCreator + _royalties.amountToPlatform == 10000, TotalRoyaltiesNot100Percent());

        _nftFactoryParameters = factoryParameters_;
        _royaltiesParameters = _royalties;
        _currentImplementations = _implementations;

        emit FactoryParametersSet(factoryParameters_, _royalties, _implementations);
    }

    /// @notice Computes a deterministic salt for a collection metadata pair.
    /// @param valueA Collection name.
    /// @param valueB Collection symbol.
    /// @return Salt equal to `keccak256(abi.encode(name, symbol))`.
    function _getHash(bytes memory valueA, bytes memory valueB) private view returns (bytes32) {
        return keccak256(abi.encode(address(this), valueA, valueB, block.chainid));
    }
}
