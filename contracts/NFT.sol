// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ReentrancyGuard} from "solady/src/utils/ReentrancyGuard.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";

import {ITransferValidator721} from "./interfaces/ITransferValidator721.sol";

import {NFTFactory} from "./factories/NFTFactory.sol";
import {BaseERC721} from "./BaseERC721.sol";

import {NftParameters, StaticPriceParams, DynamicPriceParams, InstanceInfo} from "./Structures.sol";

/// @notice Error thrown when insufficient ETH is sent for a minting transaction.
/// @param ETHsent The amount of ETH sent.
error IncorrectETHAmountSent(uint256 ETHsent);

/// @notice Error thrown when a non-transferable token is attempted to be transferred.
error NotTransferable();

/// @notice Error thrown when an invalid signature is provided for minting.
error InvalidSignature();

/// @notice Error thrown when the mint price changes unexpectedly.
/// @param expectedMintPrice The expected mint price.
/// @param currentPrice The actual current mint price.
error PriceChanged(uint256 expectedMintPrice, uint256 currentPrice);

/// @notice Error thrown when the paying token changes unexpectedly.
/// @param expectedPayingToken The expected paying token.
/// @param currentPayingToken The actual paying token.
error TokenChanged(address expectedPayingToken, address currentPayingToken);

error IncorrecArraysLength();

error WrongArraySize();

/**
 * @title NFT Contract
 * @notice Implements the minting and transfer functionality for NFTs, including transfer validation and royalty management.
 * @dev This contract inherits from BaseERC721 and implements additional minting logic, including whitelist support and fee handling.
 */
contract NFT is BaseERC721, ReentrancyGuard {
    using SignatureCheckerLib for address;
    using SafeTransferLib for address;

    /// @notice Event emitted when a payment is made to the PricePoint.
    /// @param sender The address that made the payment.
    /// @param paymentCurrency The currency used for the payment.
    /// @param value The amount of the payment.
    event Paid(address sender, address paymentCurrency, uint256 value);

    /// @notice The constant address representing ETH.
    address public constant ETH_ADDRESS =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /**
     * @dev Called by the factory when a new instance is deployed.
     * @param _params Collection parameters containing information like name, symbol, fees, and more.
     * @param newValidator The transfer validator contract address.
     */
    constructor(
        NftParameters memory _params,
        ITransferValidator721 newValidator
    ) BaseERC721(_params, newValidator) {}

    /**
     * @notice Batch mints with static prices a new NFTs to a specified addresses.
     * @dev Requires a signaturees from a trusted addresses and validates against whitelist status.
     * @param paramsArray todo
     */
    function mintStaticPriceBatch(
        StaticPriceParams[] calldata paramsArray,
        address expectedPayingToken,
        uint256 expectedMintPrice
    ) external payable {
        require(
            paramsArray.length <= NFTFactory(parameters.factory).maxArraySize(),
            WrongArraySize()
        );

        uint256 amountToPay;
        uint256 fees;
        uint256 amountsToCreator;
        for (uint256 i = 0; i < paramsArray.length; ) {
            _validateStaticPriceSignature(paramsArray[i]);

            (
                uint256 amount,
                uint256 fee,
                uint256 amountToCreator
            ) = _checkPaymentStatic(
                    paramsArray[i].whitelisted,
                    expectedPayingToken,
                    expectedMintPrice
                );

            amountToPay += amount;
            fees += fee;
            amountsToCreator += amountToCreator;

            _baseMint(
                paramsArray[i].tokenId,
                paramsArray[i].receiver,
                paramsArray[i].tokenUri
            );
            _setExtraData(paramsArray[i].tokenId, uint96(amount));

            unchecked {
                ++i;
            }
        }

        _pay(amountToPay, fees, amountsToCreator, expectedPayingToken);
    }

    /**
     * @notice Batch mints with dynamic prices a new NFTs to a specified addresses.
     * @dev Requires a signatures from a trusted addresses and validates against whitelist status.
     * @param paramsArray todo
     */
    function mintDynamicPriceBatch(
        DynamicPriceParams[] calldata paramsArray,
        address expectedPayingToken
    ) external payable {
        require(
            paramsArray.length <= NFTFactory(parameters.factory).maxArraySize(),
            WrongArraySize()
        );

        uint256 amountToPay;
        for (uint256 i = 0; i < paramsArray.length; ) {
            _validateDynamicPriceSignature(paramsArray[i]);

            amountToPay += paramsArray[i].price;

            unchecked {
                ++i;
            }
        }

        (uint256 amount, uint256 fee, uint256 amountToCreator) = _checkPrice(
            amountToPay,
            expectedPayingToken
        );

        for (uint256 i = 0; i < paramsArray.length; ) {
            _baseMint(
                paramsArray[i].tokenId,
                paramsArray[i].receiver,
                paramsArray[i].tokenUri
            );
            _setExtraData(paramsArray[i].tokenId, uint96(paramsArray[i].price));

            unchecked {
                ++i;
            }
        }

        _pay(amount, fee, amountToCreator, expectedPayingToken);
    }

    /**
     * @notice Mints a new NFT to a specified address.
     * @dev Requires a signature from a trusted address and validates against whitelist status.
     * @param params TODO
     */
    function mintStaticPrice(
        StaticPriceParams calldata params,
        address expectedPayingToken,
        uint256 expectedMintPrice
    ) public payable {
        // Validate signature
        _validateStaticPriceSignature(params);

        (
            uint256 amount,
            uint256 fee,
            uint256 amountToCreator
        ) = _checkPaymentStatic(
                params.whitelisted,
                expectedPayingToken,
                expectedMintPrice
            );

        _baseMint(params.tokenId, params.receiver, params.tokenUri);
        _setExtraData(params.tokenId, uint96(amount));

        _pay(amount, fee, amountToCreator, expectedPayingToken);
    }

    /**
     * @notice Mints a new NFT to a specified address.
     * @dev Requires a signature from a trusted address and validates against whitelist status.
     * @param params todo
     */
    function mintDynamicPrice(
        DynamicPriceParams calldata params,
        address expectedPayingToken
    ) public payable {
        // Validate signature
        _validateDynamicPriceSignature(params);

        (uint256 amount, uint256 fee, uint256 amountToCreator) = _checkPrice(
            params.price,
            expectedPayingToken
        );

        _baseMint(params.tokenId, params.receiver, params.tokenUri);
        _setExtraData(params.tokenId, uint96(params.price));

        _pay(amount, fee, amountToCreator, expectedPayingToken);
    }

    function _pay(
        uint256 amount,
        uint256 fee,
        uint256 amountToCreator,
        address expectedPayingToken
    ) private nonReentrant {
        NftParameters memory _parameters = parameters;
        NFTFactory _factory = NFTFactory(_parameters.factory);

        // Handle payments in ETH or other tokens
        if (expectedPayingToken == ETH_ADDRESS) {
            if (fee > 0) {
                _factory.platformAddress().safeTransferETH(fee);
            }

            _parameters.creator.safeTransferETH(amountToCreator);
        } else {
            if (fee > 0) {
                expectedPayingToken.safeTransferFrom(
                    msg.sender,
                    _factory.platformAddress(),
                    fee
                );
            }

            expectedPayingToken.safeTransferFrom(
                msg.sender,
                _parameters.creator,
                amountToCreator
            );
        }

        emit Paid(msg.sender, expectedPayingToken, amount);
    }

    function _checkPaymentStatic(
        bool whitelisted,
        address expectedPayingToken,
        uint256 expectedMintPrice
    ) private returns (uint256 amount, uint256 fee, uint256 amountToCreator) {
        InstanceInfo memory info = parameters.info;

        // Determine the mint price based on whitelist status
        uint256 price = whitelisted ? info.whitelistMintPrice : info.mintPrice;

        // Check if the expected mint price matches the actual price
        if (expectedMintPrice != price) {
            revert PriceChanged(expectedMintPrice, price);
        }

        (amount, fee, amountToCreator) = _checkPrice(
            price,
            expectedPayingToken
        );
    }

    function _checkPrice(
        uint256 price,
        address expectedPayingToken
    ) private returns (uint256 amount, uint256 fee, uint256 amountToCreator) {
        NftParameters memory _parameters = parameters;

        // Check if the expected paying token matches the actual paying token
        if (expectedPayingToken != _parameters.info.payingToken) {
            revert TokenChanged(
                expectedPayingToken,
                _parameters.info.payingToken
            );
        }

        amount = expectedPayingToken == ETH_ADDRESS ? msg.value : price;

        // Check if the correct amount of ETH is sent
        if (amount != price) {
            revert IncorrectETHAmountSent(price);
        }

        // Calculate platform commission and the amount to send to the creator
        unchecked {
            fee =
                (amount *
                    NFTFactory(_parameters.factory).platformCommission()) /
                _feeDenominator();

            amountToCreator = amount - fee;
        }
    }

    function _validateDynamicPriceSignature(
        DynamicPriceParams calldata params
    ) private view {
        if (
            !NFTFactory(parameters.factory).signerAddress().isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        params.receiver,
                        params.tokenId,
                        params.tokenUri,
                        params.price,
                        block.chainid
                    )
                ),
                params.signature
            )
        ) {
            revert InvalidSignature();
        }
    }

    function _validateStaticPriceSignature(
        StaticPriceParams calldata params
    ) private view {
        if (
            !NFTFactory(parameters.factory).signerAddress().isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        params.receiver,
                        params.tokenId,
                        params.tokenUri,
                        params.whitelisted,
                        block.chainid
                    )
                ),
                params.signature
            )
        ) {
            revert InvalidSignature();
        }
    }
}
