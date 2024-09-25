// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {ERC721} from "solady/src/tokens/ERC721.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";
import {PricePointFactory} from "./factories/PricePointFactory.sol";
import {PricePointParameters} from "./PricePointStructures.sol";

error ZeroAddressPasted();
error NotTransferable();
error CanBePaidOnlyByUser(address user);
error InvalidSignature();

/**
 * @title PricePoint Contract
 * @notice This contract represents an ERC721 token that handles payments and records them via a PricePoint.
 * @dev The contract includes functionality for payment processing, signature verification, and token minting.
 */
contract PricePoint is ERC721, Ownable {
    using SignatureCheckerLib for address;
    using SafeTransferLib for address;

    /// @notice Event emitted when currencies are withdrawn from the contract.
    /// @param to The address to which the currencies were withdrawn.
    event CurrenciesWithdrew(address to);

    /// @notice Event emitted when a payment is made to the PricePoint.
    /// @param paymentId The ID of the payment made.
    /// @param sender The address that made the payment.
    /// @param paymentCurrency The currency used for the payment.
    /// @param value The amount of the payment.
    event Paid(
        uint256 indexed paymentId,
        address sender,
        address paymentCurrency,
        uint256 value
    );

    /// @notice Event emitted when the payment currency is changed.
    /// @param paymentCurrency The new payment currency.
    event PaymentCurrencyChanged(address paymentCurrency);

    /// @notice Event emitted when the PricePoint factory is changed.
    /// @param factory The new PricePoint factory.
    event PricePointFactoryChanged(address factory);

    /// @notice Event emitted when the transferability of the token is changed.
    /// @param transferable A boolean indicating whether the token is transferable.
    event TransferableChanged(bool transferable);

    /// @notice Constant for representing ETH as the payment currency.
    address public constant ETH_ADDRESS =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /// @notice Reference to the PricePointFactory contract that created this PricePoint.
    PricePointFactory public factory;

    /// @notice Structure containing the parameters for the PricePoint instance.
    PricePointParameters private _params;

    /// @notice The current ID for minting tokens.
    uint256 public currentId;

    /// @notice Mapping from token ID to its metadata URI.
    mapping(uint256 => string) public metadataUri;

    /// @notice Modifier to check if the provided address is not zero.
    /// @param _address The address to check.
    modifier zeroAddressCheck(address _address) {
        if (_address == address(0)) {
            revert ZeroAddressPasted();
        }
        _;
    }

    /**
     * @notice Constructor to initialize the PricePoint contract.
     * @param params The parameters for the PricePoint.
     * @param _factory The address of the PricePointFactory that created this contract.
     */
    constructor(PricePointParameters memory params, address _factory) {
        _params = params;
        _initializeOwner(params.platform);
        _setFactory(_factory);
    }

    /**
     * @notice Function to process a payment and mint an NFT.
     * @param paidBy The address making the payment.
     * @param paymentId The ID of the payment.
     * @param tokenUri The metadata URI for the minted NFT.
     * @param amount The amount of payment to be processed.
     * @param _signature The signature verifying the payment.
     */
    function pay(
        address paidBy,
        uint256 paymentId,
        string calldata tokenUri,
        uint256 amount,
        bytes calldata _signature
    ) external payable {
        PricePointParameters memory params = _params;

        // Validate signature
        if (
            !_isSignatureValid(
                paidBy,
                paymentId,
                tokenUri,
                amount,
                _signature,
                factory.signerAddress()
            )
        ) {
            revert InvalidSignature();
        }

        if (params.info.user != paidBy) {
            revert CanBePaidOnlyByUser(params.info.user);
        }

        if (params.info.paymentCurrency == ETH_ADDRESS) {
            params.platform.safeTransferETH(amount);
        } else {
            params.info.paymentCurrency.safeTransferFrom(
                msg.sender,
                params.platform,
                amount
            );
        }

        currentId++;
        metadataUri[paymentId] = tokenUri;

        _setExtraData(paymentId, uint96(amount));
        _safeMint(msg.sender, paymentId);

        emit Paid(paymentId, msg.sender, params.info.paymentCurrency, amount);
    }

    /**
     * @notice Sets a new payment currency.
     * @param _paymentCurrency The new payment currency address.
     */
    function setPaymentCurrency(
        address _paymentCurrency
    ) external onlyOwner zeroAddressCheck(_paymentCurrency) {
        _params.info.paymentCurrency = _paymentCurrency;
        emit PaymentCurrencyChanged(_paymentCurrency);
    }

    /**
     * @notice Updates the transferability of the token.
     * @param _transferable A boolean indicating if the tokens are transferable.
     */
    function setTransferable(bool _transferable) external onlyOwner {
        _params.info.transferable = _transferable;
        emit TransferableChanged(_transferable);
    }

    /**
     * @notice Sets a new factory address.
     * @param _factory The new factory address.
     */
    function setFactory(
        address _factory
    ) external onlyOwner zeroAddressCheck(_factory) {
        _setFactory(_factory);
    }

    /**
     * @notice Retrieves the payment receipt for a specific token ID.
     * @param tokenId The ID of the token.
     * @return The payment amount associated with the token.
     */
    function getReceipt(uint256 tokenId) external view returns (uint96) {
        return _getExtraData(tokenId);
    }

    /// @notice Returns the user address associated with the token collection.
    function user() public view returns (address) {
        return _params.info.user;
    }

    /// @notice Returns the symbol of the token collection.
    function symbol() public view override returns (string memory) {
        return _params.info.symbol;
    }

    /// @notice Returns the name of the token collection.
    function name() public view override returns (string memory) {
        return _params.info.name;
    }

    /**
     * @notice Returns the contract URI for the collection.
     */
    function contractURI() external view returns (string memory) {
        return _params.info.contractURI;
    }

    /**
     * @notice Returns the payment currency for the collection.
     */
    function paymentCurrency() external view returns (address) {
        return _params.info.paymentCurrency;
    }

    /**
     * @notice Returns the transferability status of the tokens.
     */
    function transferable() external view returns (bool) {
        return _params.info.transferable;
    }

    /**
     * @notice Returns the signature used for verification.
     */
    function signature() external view returns (bytes memory) {
        return _params.info.signature;
    }

    /// @notice Returns the platform address associated with this contract.
    function platform() public view returns (address) {
        return _params.platform;
    }

    /// @notice Returns the metadata URI for a specific token ID.
    /// @param id The ID of the token.
    function tokenURI(uint256 id) public view override returns (string memory) {
        return metadataUri[id];
    }

    /**
     * @dev Overrides the default token transfer behavior to check transferability.
     * @param from The address sending the token.
     * @param to The address receiving the token.
     * @param id The ID of the token being transferred.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 id
    ) internal override {
        super._beforeTokenTransfer(from, to, id);

        // Check if the transaction is a regular transfer and not mint/burn
        if (
            from != address(0) && to != address(0) && !_params.info.transferable
        ) {
            revert NotTransferable();
        }
    }

    /**
     * @notice Verifies if the signature is valid for the current signer address.
     * @param paidBy The address making the payment.
     * @param paymentId The ID of the payment.
     * @param tokenUri The metadata URI of the token.
     * @param amount The amount paid.
     * @param _signature The signature to validate.
     * @param signerAddress The address of the signer.
     * @return bool Whether the signature is valid.
     */
    function _isSignatureValid(
        address paidBy,
        uint256 paymentId,
        string calldata tokenUri,
        uint256 amount,
        bytes calldata _signature,
        address signerAddress
    ) internal view returns (bool) {
        return
            signerAddress.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        paidBy,
                        paymentId,
                        tokenUri,
                        amount,
                        block.chainid
                    )
                ),
                _signature
            );
    }

    /**
     * @notice Sets the factory address.
     * @param _factory The new factory address.
     */
    function _setFactory(address _factory) private {
        factory = PricePointFactory(_factory);
        emit PricePointFactoryChanged(_factory);
    }
}
