// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";

import {ITransferValidator721} from "../interfaces/ITransferValidator721.sol";
import {NFT} from "../NFT.sol";
import {NftFactoryInfo, NftParameters, InstanceInfo, NftParamsInfo} from "../Structures.sol";

/// @notice Error thrown when the signature provided is invalid.
error InvalidSignature();
/// @notice Error thrown when an empty name is provided for an NFT.
error EmptyNamePassed();
/// @notice Error thrown when an empty symbol is provided for an NFT.
error EmptySymbolPassed();
/// @notice Error thrown when an NFT with the same name and symbol already exists.
error NFTAlreadyExists();
/// @notice Error thrown when a zero address is passed where it's not allowed.
error ZeroAddressPassed();
/// @notice Error thrown when an incorrect instance ID is provided.
error IncorrectInstanceId();

/**
 * @title NFT Factory Contract
 * @notice A factory contract to create new NFT instances with specific parameters.
 * @dev This contract allows producing NFTs, managing platform settings, and verifying signatures.
 */
contract NFTFactory is OwnableUpgradeable {
    using SignatureCheckerLib for address;

    /// @notice Event emitted when a new NFT is created.
    /// @param name Name of the created NFT.
    /// @param symbol Symbol of the created NFT.
    /// @param instance The address of the created NFT instance.
    /// @param id The ID of the newly created NFT.
    event NFTCreated(string name, string symbol, NFT instance, uint256 id);

    /// @notice Event emitted when the signer address is set.
    /// @param newSigner The new signer address.
    event SignerSet(address newSigner);

    /// @notice Event emitted when the platform commission is set.
    /// @param newCommission The new platform commission in basis points.
    event PlatformCommissionSet(uint256 newCommission);

    /// @notice Event emitted when the platform address is set.
    /// @param newPlatformAddress The new platform address.
    event PlatformAddressSet(address newPlatformAddress);

    /// @notice Event emitted when the transfer validator is set.
    /// @param newValidator The new transfer validator contract.
    event TransferValidatorSet(ITransferValidator721 newValidator);

    /// @notice Event emitted when the default payment currency is set.
    /// @param defaultPaymentCurrency The new default payment currency.
    event DefaultPaymentCurrencySet(address defaultPaymentCurrency);

    /// @notice Event emitted when the maximum array size is set.
    /// @param arraySize The new maximum array size.
    event MaxArraySizeSet(uint256 arraySize);

    /// @notice The current transfer validator contract.
    ITransferValidator721 public transferValidator;

    /// @notice A struct that contains info parameters for the NFTFactory.
    NftFactoryInfo private _info;

    /// @notice An array storing all created NFT instances.
    NFT[] public instances;

    /// @notice A mapping from keccak256(name, symbol) to the NFT instance address.
    mapping(bytes32 => NFT) public getInstance;

    /// @notice A mapping from NFT instance address to its storage information.
    mapping(NFT => NftParamsInfo) public instanceInfos;

    /// @notice Modifier to check if the passed address is not zero.
    /// @param _address The address to check.
    modifier zeroAddressCheck(address _address) {
        if (_address == address(0)) {
            revert ZeroAddressPassed();
        }
        _;
    }

    /**
     * @notice Initializes the contract with NFT factory info and validator.
     * @param info The info of NFTFactory.
     * @param validator The transfer validator contract.
     */
    function initialize(
        NftFactoryInfo calldata info,
        ITransferValidator721 validator
    ) external initializer {
        _info = info;
        _setTransferValidator(validator);
        __Ownable_init(msg.sender);
    }

    /**
     * @notice Sets the default payment currency address.
     * @dev Can only be called by the owner.
     * @param _paymentCurrency The new default payment currency address.
     */
    function setDefaultPaymentCurrency(
        address _paymentCurrency
    ) external onlyOwner zeroAddressCheck(_paymentCurrency) {
        _info.defaultPaymentCurrency = _paymentCurrency;
        emit DefaultPaymentCurrencySet(_paymentCurrency);
    }

    /**
     * @notice Sets a new maximum array size.
     * @dev Can only be called by the owner.
     * @param _arraySize The new maximum array size.
     */
    function setMaxArraySize(uint256 _arraySize) external onlyOwner {
        _info.maxArraySize = _arraySize;
        emit MaxArraySizeSet(_arraySize);
    }

    /**
     * @notice Sets a new platform commission.
     * @dev Can only be called by the owner.
     * @param _platformCommission The new platform commission in basis points.
     */
    function setPlatformCommission(
        uint256 _platformCommission
    ) external onlyOwner {
        _info.platformCommission = _platformCommission;
        emit PlatformCommissionSet(_platformCommission);
    }

    /**
     * @notice Sets a new platform address.
     * @dev Can only be called by the owner.
     * @param _platformAddress The new platform address.
     */
    function setPlatformAddress(
        address _platformAddress
    ) external onlyOwner zeroAddressCheck(_platformAddress) {
        _info.platformAddress = _platformAddress;
        emit PlatformAddressSet(_platformAddress);
    }

    /**
     * @notice Sets a new signer address.
     * @dev Can only be called by the owner.
     * @param _signer The new signer address.
     */
    function setSigner(
        address _signer
    ) external onlyOwner zeroAddressCheck(_signer) {
        _info.signerAddress = _signer;
        emit SignerSet(_signer);
    }

    /**
     * @notice Sets a new transfer validator contract.
     * @dev Can only be called by the owner.
     * @param validator The new transfer validator contract.
     */
    function setTransferValidator(
        ITransferValidator721 validator
    ) external onlyOwner {
        _setTransferValidator(validator);
    }

    /**
     * @notice Produces a new NFT instance.
     * @dev Creates a new instance of the NFT and adds the information to the storage contract.
     * @param info Struct containing the details of the new NFT instance.
     * @return nft The address of the created NFT instance.
     */
    function produce(InstanceInfo memory info) external returns (NFT nft) {
        if ((bytes(info.name)).length == 0) {
            revert EmptyNamePassed();
        }
        if ((bytes(info.symbol)).length == 0) {
            revert EmptySymbolPassed();
        }

        bytes32 hashedNameSymbol = keccak256(
            abi.encodePacked(info.name, info.symbol)
        );

        if (getInstance[hashedNameSymbol] != NFT(address(0))) {
            revert NFTAlreadyExists();
        }

        if (!_isSignatureValid(info)) {
            revert InvalidSignature();
        }

        address payingToken = info.payingToken == address(0)
            ? _info.defaultPaymentCurrency
            : info.payingToken;

        uint256 id = instances.length;

        info.payingToken = payingToken;

        NftParameters memory params = NftParameters({
            factory: address(this),
            info: info,
            creator: msg.sender
        });

        nft = new NFT(params, transferValidator);

        instances.push(nft);
        getInstance[hashedNameSymbol] = nft;
        instanceInfos[nft] = NftParamsInfo({
            name: info.name,
            symbol: info.symbol,
            creator: msg.sender
        });

        emit NFTCreated(info.name, info.symbol, nft, id);
    }

    /**
     * @notice Retrieves information about a specific NFT instance.
     * @param instanceId The ID of the NFT instance.
     * @return instanceInfo The information about the specified instance.
     * @dev Reverts with `IncorrectInstanceId` if the provided ID is invalid.
     */
    function getInstanceInfo(
        uint256 instanceId
    ) external view returns (NftParamsInfo memory) {
        if (instanceId >= instances.length) {
            revert IncorrectInstanceId();
        }

        return instanceInfos[instances[instanceId]];
    }

    /**
     * @notice Returns the total count of NFT instances stored in the contract.
     * @return The number of NFT instances.
     */
    function platformAddress() external view returns (address) {
        return _info.platformAddress;
    }

    /**
     * @notice Returns the total count of NFT instances stored in the contract.
     * @return The number of NFT instances.
     */
    function signerAddress() external view returns (address) {
        return _info.signerAddress;
    }

    /**
     * @notice Returns the total count of NFT instances stored in the contract.
     * @return The number of NFT instances.
     */
    function defaultPaymentCurrency() external view returns (address) {
        return _info.defaultPaymentCurrency;
    }

    /**
     * @notice Returns the total count of NFT instances stored in the contract.
     * @return The number of NFT instances.
     */
    function platformCommission() external view returns (uint256) {
        return _info.platformCommission;
    }

    /**
     * @notice Returns the max array size.
     * @return The max array size.
     */
    function maxArraySize() external view returns (uint256) {
        return _info.maxArraySize;
    }

    /**
     * @notice Returns the total count of NFT instances stored in the contract.
     * @return The number of NFT instances.
     */
    function instancesCount() external view returns (uint256) {
        return instances.length;
    }

    /// @notice Verifies if the signature is valid for the current signer address.
    /// @dev This function checks the signature for the provided NFT data.
    /// @param info Struct containing the details of the new NFT instance.
    /// @return bool Whether the signature is valid.
    function _isSignatureValid(
        InstanceInfo memory info
    ) internal view returns (bool) {
        return
            _info.signerAddress.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        info.name,
                        info.symbol,
                        info.contractURI,
                        info.feeNumerator,
                        info.feeReceiver,
                        block.chainid
                    )
                ),
                info.signature
            );
    }

    /// @notice Private function to set the transfer validator contract.
    /// @param validator The new transfer validator contract.
    function _setTransferValidator(
        ITransferValidator721 validator
    ) private zeroAddressCheck(address(validator)) {
        transferValidator = validator;
        emit TransferValidatorSet(validator);
    }
}
