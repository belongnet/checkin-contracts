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

contract PricePoint is ERC721, Ownable {
    using SignatureCheckerLib for address;
    using SafeTransferLib for address;

    event CurrenciesWithdrew(address to);
    event Paid(
        uint256 indexed paymentId,
        address sender,
        address paymentCurrency,
        uint256 value
    );
    event PaymentCurrencyChanged(address paymentCurrency);
    event PricePointFactoryChanged(address factory);
    event TransferableChanged(bool transferable);

    address public constant ETH_ADDRESS =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    PricePointFactory public factory;
    PricePointParameters private _params;

    uint256 public currentId;

    /// @notice Mapping of token ID to its metadata URI.
    mapping(uint256 => string) public metadataUri;

    modifier zeroAddressCheck(address _address) {
        if (_address == address(0)) {
            revert ZeroAddressPasted();
        }
        _;
    }

    constructor(PricePointParameters memory params, address _factory) {
        _params = params;

        _initializeOwner(params.platform);
        _setFactory(_factory);
    }

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

    function setPaymentCurrency(
        address _paymentCurrency
    ) external onlyOwner zeroAddressCheck(_paymentCurrency) {
        _params.info.paymentCurrency = _paymentCurrency;

        emit PaymentCurrencyChanged(_paymentCurrency);
    }

    function setTransferable(bool _transferable) external onlyOwner {
        _params.info.transferable = _transferable;

        emit TransferableChanged(_transferable);
    }

    function setFactory(
        address _factory
    ) external onlyOwner zeroAddressCheck(_factory) {
        _setFactory(_factory);
    }

    function getReceipt(uint256 tokenId) external view returns (uint96) {
        return _getExtraData(tokenId);
    }

    /// @dev Returns the token collection user.
    function user() public view returns (address) {
        return _params.info.user;
    }

    /// @dev Returns the token collection symbol.
    function symbol() public view override returns (string memory) {
        return _params.info.symbol;
    }

    /// @dev Returns the token collection name.
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
     * @notice Returns the contract URI for the collection.
     */
    function paymentCurrency() external view returns (address) {
        return _params.info.paymentCurrency;
    }

    /**
     * @notice Returns the contract URI for the collection.
     */
    function transferable() external view returns (bool) {
        return _params.info.transferable;
    }

    /**
     * @notice Returns the contract URI for the collection.
     */
    function signature() external view returns (bytes memory) {
        return _params.info.signature;
    }

    function platform() public view returns (address) {
        return _params.platform;
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        return metadataUri[id];
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 id
    ) internal override {
        super._beforeTokenTransfer(from, to, id);

        // Check if the transaction is not a mint/burn, only a transfer
        if (
            from != address(0) && to != address(0) && !_params.info.transferable
        ) {
            revert NotTransferable();
        }
    }

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

    function _setFactory(address _factory) private {
        factory = PricePointFactory(_factory);

        emit PricePointFactoryChanged(_factory);
    }
}
