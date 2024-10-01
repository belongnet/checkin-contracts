// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";
import {ITransferValidator721} from "./interfaces/ITransferValidator721.sol";
import {NFTFactory} from "./factories/NFTFactory.sol";
import {BaseERC721} from "./BaseERC721.sol";
import {NftParameters, StaticPriceParameters, DynamicPriceParameters, InstanceInfo} from "./Structures.sol";

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
/// @param currentPayingToken The actual current paying token.
error TokenChanged(address expectedPayingToken, address currentPayingToken);

/// @notice Error thrown when the lengths of the provided arrays do not match.
error IncorrectArraysLength();

/// @notice Error thrown when an array exceeds the maximum allowed size.
error WrongArraySize();

/**
 * @title NFT Contract
 * @notice Implements the minting and transfer functionality for NFTs, including transfer validation and royalty management.
 * @dev This contract inherits from BaseERC721 and implements additional minting logic, including whitelist support and fee handling.
 */
contract NFT is BaseERC721 {
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
     * @notice Deploys the contract with the given collection parameters and transfer validator.
     * @dev Called by the factory when a new instance is deployed.
     * @param _params Collection parameters containing information like name, symbol, fees, and more.
     */
    constructor(NftParameters memory _params) BaseERC721(_params) {}

    /**
     * @notice Batch mints new NFTs with static prices to specified addresses.
     * @dev Requires signatures from trusted addresses and validates against whitelist status.
     * @param paramsArray An array of parameters for each mint (receiver, tokenId, tokenUri, whitelisted).
     * @param expectedPayingToken The expected token used for payments.
     * @param expectedMintPrice The expected price for the minting operation.
     */
    function mintStaticPriceBatch(
        StaticPriceParameters[] calldata paramsArray,
        address expectedPayingToken,
        uint256 expectedMintPrice
    ) external payable {
        require(
            paramsArray.length <=
                NFTFactory(parameters.factory)
                    .nftFactoryParameters()
                    .maxArraySize,
            WrongArraySize()
        );

        InstanceInfo memory info = parameters.info;

        uint256 amountToPay;
        for (uint256 i = 0; i < paramsArray.length; ) {
            _validateStaticPriceSignature(paramsArray[i]);

            // Determine the mint price based on whitelist status
            uint256 price = paramsArray[i].whitelisted
                ? info.whitelistMintPrice
                : info.mintPrice;

            amountToPay += price;

            _baseMint(
                paramsArray[i].tokenId,
                paramsArray[i].receiver,
                paramsArray[i].tokenUri
            );
            _setExtraData(paramsArray[i].tokenId, uint96(price));

            unchecked {
                ++i;
            }
        }

        (uint256 amount, uint256 fees, uint256 amountToCreator) = _checkPrice(
            amountToPay,
            expectedPayingToken
        );

        // Check if the expected mint price matches the actual price
        if (expectedMintPrice != amount) {
            revert PriceChanged(expectedMintPrice, amount);
        }

        _pay(amount, fees, amountToCreator, expectedPayingToken);
    }

    /**
     * @notice Batch mints new NFTs with dynamic prices to specified addresses.
     * @dev Requires signatures from trusted addresses and validates against whitelist status.
     * @param paramsArray An array of parameters for each mint (receiver, tokenId, tokenUri, price).
     * @param expectedPayingToken The expected token used for payments.
     */
    function mintDynamicPriceBatch(
        DynamicPriceParameters[] calldata paramsArray,
        address expectedPayingToken
    ) external payable {
        require(
            paramsArray.length <=
                NFTFactory(parameters.factory)
                    .nftFactoryParameters()
                    .maxArraySize,
            WrongArraySize()
        );

        uint256 amountToPay;
        for (uint256 i = 0; i < paramsArray.length; ) {
            _validateDynamicPriceSignature(paramsArray[i]);

            amountToPay += paramsArray[i].price;

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

        (uint256 amount, uint256 fees, uint256 amountToCreator) = _checkPrice(
            amountToPay,
            expectedPayingToken
        );

        _pay(amount, fees, amountToCreator, expectedPayingToken);
    }

    /**
     * @notice Mints a new NFT with a static price to a specified address.
     * @dev Requires a signature from a trusted address and validates against whitelist status.
     * @param params Minting parameters including receiver, tokenId, tokenUri, and whitelist status.
     * @param expectedPayingToken The expected token used for payments.
     * @param expectedMintPrice The expected price for the minting operation.
     */
    function mintStaticPrice(
        StaticPriceParameters calldata params,
        address expectedPayingToken,
        uint256 expectedMintPrice
    ) public payable {
        _validateStaticPriceSignature(params);

        InstanceInfo memory info = parameters.info;

        uint256 price = params.whitelisted
            ? info.whitelistMintPrice
            : info.mintPrice;

        if (expectedMintPrice != price) {
            revert PriceChanged(expectedMintPrice, price);
        }

        (uint256 amount, uint256 fees, uint256 amountToCreator) = _checkPrice(
            price,
            expectedPayingToken
        );

        _baseMint(params.tokenId, params.receiver, params.tokenUri);
        _setExtraData(params.tokenId, uint96(amount));

        _pay(amount, fees, amountToCreator, expectedPayingToken);
    }

    /**
     * @notice Mints a new NFT with a dynamic price to a specified address.
     * @dev Requires a signature from a trusted address and validates against whitelist status.
     * @param params Minting parameters including receiver, tokenId, tokenUri, and price.
     * @param expectedPayingToken The expected token used for payments.
     */
    function mintDynamicPrice(
        DynamicPriceParameters calldata params,
        address expectedPayingToken
    ) public payable {
        _validateDynamicPriceSignature(params);

        (uint256 amount, uint256 fees, uint256 amountToCreator) = _checkPrice(
            params.price,
            expectedPayingToken
        );

        _baseMint(params.tokenId, params.receiver, params.tokenUri);
        _setExtraData(params.tokenId, uint96(params.price));

        _pay(amount, fees, amountToCreator, expectedPayingToken);
    }

    /**
     * @notice Handles the payment for minting NFTs, including sending fees to the platform and creator.
     * @dev Payments can be made in ETH or another token.
     * @param amount The total amount to be paid.
     * @param fees The platform commission.
     * @param amountToCreator The amount to send to the creator.
     * @param expectedPayingToken The token used for the payment.
     */
    function _pay(
        uint256 amount,
        uint256 fees,
        uint256 amountToCreator,
        address expectedPayingToken
    ) private {
        NftParameters memory _parameters = parameters;
        NFTFactory _factory = NFTFactory(_parameters.factory);

        bytes32 refferalCode = _parameters.refferalCode;
        address refferalCreator = _factory.getReferralCreator(refferalCode);

        uint256 feesToPlatform = fees;
        uint256 referralFees;
        if (refferalCode != bytes32(0)) {
            referralFees = _factory.getReferralRate(
                _parameters.creator,
                refferalCode,
                fees
            );
            feesToPlatform -= referralFees;
        }

        if (expectedPayingToken == ETH_ADDRESS) {
            if (feesToPlatform > 0) {
                _factory.nftFactoryParameters().platformAddress.safeTransferETH(
                    feesToPlatform
                );
            }
            if (referralFees > 0) {
                refferalCreator.safeTransferETH(referralFees);
            }

            _parameters.creator.safeTransferETH(amountToCreator);
        } else {
            if (feesToPlatform > 0) {
                expectedPayingToken.safeTransferFrom(
                    msg.sender,
                    _factory.nftFactoryParameters().platformAddress,
                    feesToPlatform
                );
            }
            if (referralFees > 0) {
                expectedPayingToken.safeTransferFrom(
                    msg.sender,
                    refferalCreator,
                    referralFees
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

    /**
     * @notice Verifies the price and calculates the platform commission and amount to send to the creator.
     * @param price The price to check.
     * @param expectedPayingToken The token used for the payment.
     * @return amount The total amount to be paid.
     * @return fees The platform commission.
     * @return amountToCreator The amount to send to the creator.
     */
    function _checkPrice(
        uint256 price,
        address expectedPayingToken
    ) private returns (uint256 amount, uint256 fees, uint256 amountToCreator) {
        NftParameters memory _parameters = parameters;

        if (expectedPayingToken != _parameters.info.payingToken) {
            revert TokenChanged(
                expectedPayingToken,
                _parameters.info.payingToken
            );
        }

        amount = expectedPayingToken == ETH_ADDRESS ? msg.value : price;

        if (amount != price) {
            revert IncorrectETHAmountSent(amount);
        }

        unchecked {
            fees =
                (amount *
                    NFTFactory(_parameters.factory)
                        .nftFactoryParameters()
                        .platformCommission) /
                _feeDenominator();

            amountToCreator = amount - fees;
        }
    }

    /**
     * @notice Validates the signature for a dynamic price minting transaction.
     * @param params The parameters of the minting operation.
     */
    function _validateDynamicPriceSignature(
        DynamicPriceParameters calldata params
    ) private view {
        if (
            !NFTFactory(parameters.factory)
                .nftFactoryParameters()
                .signerAddress
                .isValidSignatureNow(
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

    /**
     * @notice Validates the signature for a static price minting transaction.
     * @param params The parameters of the minting operation.
     */
    function _validateStaticPriceSignature(
        StaticPriceParameters calldata params
    ) private view {
        if (
            !NFTFactory(parameters.factory)
                .nftFactoryParameters()
                .signerAddress
                .isValidSignatureNow(
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
