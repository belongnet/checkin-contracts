// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";

import {PricePoint} from "../PricePoint.sol";

import {PricePointInfo, PricePointParameters} from "../PricePointStructures.sol";

error InvalidSignature();
error EmptyNamePasted();
error EmptySymbolPasted();
error PricePointAlreadyExists(bytes32 hash);
error ZeroAddressPasted();

/// @title PricePoint Factory Contract
/// @notice A factory contract to create new PricePoint instances with specific parameters
/// @dev This contract allows producing PricePoints, managing platform settings, and verifying signatures
contract PricePointFactory is OwnableUpgradeable {
    using SignatureCheckerLib for address;

    /// @notice Event emitted when a new PricePoint is created
    /// @param name Name of the created PricePoint
    /// @param symbol Symbol of the created PricePoint
    /// @param id The ID of the newly created PricePoint
    event PricePointCreated(
        address user,
        string name,
        string symbol,
        PricePoint pricePoint,
        uint256 id
    );

    /// @notice Event emitted when the signer address is set
    /// @param newSigner The new signer address
    event SignerSet(address newSigner);

    /// @notice Event emitted when the platform address is set
    /// @param newPlatformAddress The new platform address
    event PlatformAddressSet(address newPlatformAddress);

    /// @notice Event emitted when the default payment currency is set
    /// @param defaultPaymentCurrency The new default payment currency
    event DefaultPaymentCurrencySet(address defaultPaymentCurrency);

    /// @notice Platform address that is allowed to collect fees
    address public platformAddress;
    /// @notice Address of the signer used for signature verification
    address public signerAddress;
    /// @notice Address of the default payment currency
    address public defaultPaymentCurrency;

    /// @notice An array storing all created PricePoint instances.
    PricePoint[] public pricePoints;
    /// @notice A mapping from keccak256(name, symbol) to the PricePoint instance address.
    mapping(bytes32 => PricePoint) public pricePointsByHash;

    /// @notice Modifier to check if the passed address is not zero
    /// @param _address The address to check
    modifier zeroAddressCheck(address _address) {
        if (_address == address(0)) {
            revert ZeroAddressPasted();
        }

        _;
    }

    // constructor() {
    //     _disableInitializers();
    // }

    /// @notice Initializes the contract
    /// @param _defaultPaymentCurrency The address of the default payment currency
    /// @param _signer The address of the signer
    /// @param _platformAddress The address of the platform that collects fees
    function initialize(
        address _defaultPaymentCurrency,
        address _signer,
        address _platformAddress
    ) external initializer {
        __Ownable_init(msg.sender);

        _setDefaultPaymentCurrency(_defaultPaymentCurrency);
        _setSigner(_signer);
        _setPlatformAddress(_platformAddress);
    }

    /// @notice Sets new default payment currency address
    /// @dev Can only be called by the owner
    /// @param _paymentCurrency The new default payment currency address
    function setDefaultPaymentCurrency(
        address _paymentCurrency
    ) external onlyOwner {
        _setDefaultPaymentCurrency(_paymentCurrency);
    }

    /// @notice Sets new platform address
    /// @dev Can only be called by the owner
    /// @param _platformAddress The new platform address
    function setPlatformAddress(address _platformAddress) external onlyOwner {
        _setPlatformAddress(_platformAddress);
    }

    /// @notice Sets new signer address
    /// @dev Can only be called by the owner
    /// @param _signer The new signer address
    function setSigner(address _signer) external onlyOwner {
        _setSigner(_signer);
    }

    /// @notice Produces a new PricePoint instance
    /// @dev Creates a new instance of the PricePoint and adds the information to the storage contract
    /// @param _info Struct containing the details of the new PricePoint instance
    /// @return pricePoint The address of the created PricePoint instance
    function produce(
        PricePointInfo memory _info
    ) external returns (PricePoint pricePoint) {
        if ((bytes(_info.name)).length == 0) {
            revert EmptyNamePasted();
        }
        if ((bytes(_info.symbol)).length == 0) {
            revert EmptySymbolPasted();
        }

        if (
            !_isSignatureValid(
                _info.user,
                _info.name,
                _info.symbol,
                _info.contractURI,
                _info.signature
            )
        ) {
            revert InvalidSignature();
        }

        address _paymentCurrency = _info.paymentCurrency == address(0)
            ? defaultPaymentCurrency
            : _info.paymentCurrency;

        _info.paymentCurrency = _paymentCurrency;

        PricePointParameters memory params = PricePointParameters({
            info: _info,
            platform: platformAddress
        });

        bytes32 pricePointHash = keccak256(
            abi.encodePacked(_info.user, _info.name, _info.symbol)
        );

        if (pricePointsByHash[pricePointHash] != PricePoint(address(0))) {
            revert PricePointAlreadyExists(pricePointHash);
        }

        uint256 pricePointId = pricePoints.length;

        pricePoint = new PricePoint(params, address(this));

        pricePointsByHash[pricePointHash] = pricePoint;
        pricePoints.push(pricePoint);

        emit PricePointCreated(
            _info.user,
            _info.name,
            _info.symbol,
            pricePoint,
            pricePointId
        );
    }

    /// @notice Verifies if the signature is valid for the current signer address
    /// @dev This function checks the signature for the provided NFT data
    /// @param name Name of the new NFT instance
    /// @param symbol Symbol of the new NFT instance
    /// @param contractURI URI for the new contract
    /// @param signature The signature to validate
    /// @return bool Whether the signature is valid
    function _isSignatureValid(
        address user,
        string memory name,
        string memory symbol,
        string memory contractURI,
        bytes memory signature
    ) internal view returns (bool) {
        return
            signerAddress.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        user,
                        name,
                        symbol,
                        contractURI,
                        block.chainid
                    )
                ),
                signature
            );
    }

    /// @notice Private function to set the platform address
    /// @param _platformAddress The new platform address
    function _setPlatformAddress(
        address _platformAddress
    ) private zeroAddressCheck(_platformAddress) {
        platformAddress = _platformAddress;
        emit PlatformAddressSet(_platformAddress);
    }

    /// @notice Private function to set the default payment currency address
    /// @param _paymentCurrency The new default payment currency address
    function _setDefaultPaymentCurrency(
        address _paymentCurrency
    ) private zeroAddressCheck(_paymentCurrency) {
        defaultPaymentCurrency = _paymentCurrency;
        emit DefaultPaymentCurrencySet(_paymentCurrency);
    }

    /// @notice Private function to set the signer address
    /// @param _signer The new signer address
    function _setSigner(address _signer) private zeroAddressCheck(_signer) {
        signerAddress = _signer;
        emit SignerSet(_signer);
    }
}
