// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ERC721} from "solady/src/tokens/ERC721.sol";
import {ERC2981} from "solady/src/tokens/ERC2981.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

import {CreatorToken} from "./utils/CreatorToken.sol";
import {NFTFactory, SignatureCheckerLib, NftParameters, InstanceInfo} from "./factories/NFTFactory.sol";
import {AutoValidatorTransferApprove} from "./utils/AutoValidatorTransferApprove.sol";

import {StaticPriceParameters, DynamicPriceParameters, NftParameters} from "./Structures.sol";

// ========== Errors ==========

/// @notice Error thrown when insufficient ETH is sent for a minting transaction.
/// @param ETHsent The amount of ETH sent.
error IncorrectETHAmountSent(uint256 ETHsent);

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

/// @notice Error thrown when an array exceeds the maximum allowed size.
error WrongArraySize();

/// @notice Thrown when a zero address is provided where it's not allowed.
error ZeroAddressPassed();

/// @notice Thrown when a zero amount is provided where it's not allowed.
error InvalidMintPrice();

/// @notice Thrown when an unauthorized transfer attempt is made.
error NotTransferable();

/// @notice Error thrown when the total supply limit is reached.
error TotalSupplyLimitReached();

/// @notice Error thrown when the token id is not exist.
error TokenIdDoesNotExist();

/**
 * @title NFT Contract
 * @notice Implements the minting and transfer functionality for NFTs, including transfer validation and royalty management.
 * @dev This contract inherits from BaseERC721 and implements additional minting logic, including whitelist support and fee handling.
 */
contract NFT is
    ERC721,
    ERC2981,
    Ownable,
    CreatorToken,
    AutoValidatorTransferApprove
{
    using SignatureCheckerLib for address;
    using SafeTransferLib for address;

    // ========== Events ==========

    /// @notice Event emitted when a payment is made to the PricePoint.
    /// @param sender The address that made the payment.
    /// @param paymentCurrency The currency used for the payment.
    /// @param value The amount of the payment.
    event Paid(address indexed sender, address paymentCurrency, uint256 value);

    /// @notice Emitted when the paying token and prices are updated.
    /// @param newToken The address of the new paying token.
    /// @param newPrice The new mint price.
    /// @param newWLPrice The new whitelist mint price.
    event PaymentInfoChanged(
        address newToken,
        uint256 newPrice,
        uint256 newWLPrice
    );

    // ========== State Variables ==========

    /// @notice The constant address representing ETH.
    address public constant ETH_ADDRESS =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /// @notice Check https://eips.ethereum.org/EIPS/eip-4906
    bytes4 private constant _INTERFACE_ID_ERC4906 = 0x49064906;

    /// @notice The current total supply of tokens.
    uint256 public totalSupply;

    /// @notice Mapping of token ID to its metadata URI.
    mapping(uint256 => string) public metadataUri;

    /// @notice The struct containing all NFT parameters for the collection.
    NftParameters public parameters;

    // ========== Constructor ==========

    /**
     * @notice Deploys the contract with the given collection parameters and transfer validator.
     * @dev Called by the factory when a new instance is deployed.
     * @param _params Collection parameters containing information like name, symbol, fees, and more.
     */
    constructor(NftParameters memory _params) {
        parameters = _params;

        _setDefaultRoyalty(_params.info.feeReceiver, _params.info.feeNumerator);
        _setTransferValidator(_params.transferValidator);

        _initializeOwner(_params.creator);
    }

    // ========== Functions ==========

    /**
     * @notice Sets whether the transfer validator is automatically approved as an operator for all token owners.
     * @dev Can only be called by the contract owner.
     * @param autoApprove If true, the transfer validator will be automatically approved for all token holders.
     */
    function setAutomaticApprovalOfTransfersFromValidator(
        bool autoApprove
    ) external onlyOwner {
        _setAutomaticApprovalOfTransfersFromValidator(autoApprove);
    }

    /**
     * @notice Sets a new paying token and mint prices for the collection.
     * @param _payingToken The new paying token address.
     * @param _mintPrice The new mint price.
     * @param _whitelistMintPrice The new whitelist mint price.
     */
    function setPayingToken(
        address _payingToken,
        uint128 _mintPrice,
        uint128 _whitelistMintPrice
    ) external onlyOwner {
        if (_payingToken == address(0)) {
            revert ZeroAddressPassed();
        }

        if (_mintPrice == 0) {
            revert InvalidMintPrice();
        }

        parameters.info.payingToken = _payingToken;
        parameters.info.mintPrice = _mintPrice;
        parameters.info.whitelistMintPrice = _whitelistMintPrice;

        emit PaymentInfoChanged(_payingToken, _mintPrice, _whitelistMintPrice);
    }

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
            _validatePriceSignature(paramsArray[i]);

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
            _validatePriceSignature(paramsArray[i]);

            amountToPay += paramsArray[i].price;

            _baseMint(
                paramsArray[i].tokenId,
                paramsArray[i].receiver,
                paramsArray[i].tokenUri
            );

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
    ) external payable {
        _validatePriceSignature(params);

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
    ) external payable {
        _validatePriceSignature(params);

        (uint256 amount, uint256 fees, uint256 amountToCreator) = _checkPrice(
            params.price,
            expectedPayingToken
        );

        _baseMint(params.tokenId, params.receiver, params.tokenUri);

        _pay(amount, fees, amountToCreator, expectedPayingToken);
    }

    /**
     * @notice Returns the metadata URI for a specific token ID.
     * @param _tokenId The ID of the token.
     * @return The metadata URI associated with the given token ID.
     */
    function tokenURI(
        uint256 _tokenId
    ) public view override returns (string memory) {
        if (!_exists(_tokenId)) {
            revert TokenIdDoesNotExist();
        }

        return metadataUri[_tokenId];
    }

    /// @notice Returns the name of the token collection.
    /// @return The name of the token.
    function name() public view override returns (string memory) {
        return parameters.info.name;
    }

    /// @notice Returns the symbol of the token collection.
    /// @return The symbol of the token.
    function symbol() public view override returns (string memory) {
        return parameters.info.symbol;
    }

    /**
     * @notice Returns the contract URI for the collection.
     * @return The contract URI.
     */
    function contractURI() external view returns (string memory) {
        return parameters.info.contractURI;
    }

    /**
     * @notice Checks if an operator is approved to manage all tokens of a given owner.
     * @dev Overrides the default behavior to automatically approve the transfer validator if enabled.
     * @param _owner The owner of the tokens.
     * @param operator The operator trying to manage the tokens.
     * @return isApproved Whether the operator is approved for all tokens of the owner.
     */
    function isApprovedForAll(
        address _owner,
        address operator
    ) public view override returns (bool isApproved) {
        isApproved = super.isApprovedForAll(_owner, operator);

        if (!isApproved && autoApproveTransfersFromValidator) {
            isApproved = operator == address(_transferValidator);
        }
    }

    /// @dev Returns true if this contract implements the interface defined by `interfaceId`.
    /// See: https://eips.ethereum.org/EIPS/eip-165
    /// This function call must use less than 30000 gas.
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC2981) returns (bool) {
        bool result;
        /// @solidity memory-safe-assembly
        assembly {
            let s := shr(224, interfaceId)
            // ICreatorToken: 0xad0d7f6c, ILegacyCreatorToken: 0xa07d229a.
            // ERC4906: 0x49064906, check https://eips.ethereum.org/EIPS/eip-4906.
            result := or(
                or(eq(s, 0xad0d7f6c), eq(s, 0xa07d229a)),
                eq(s, 0x49064906)
            )
        }

        return result || super.supportsInterface(interfaceId);
    }

    /**
     * @notice Mints a new token and assigns it to a specified address.
     * @dev Increases totalSupply, stores metadata URI, and creation timestamp.
     * @param to The address that will receive the newly minted token.
     * @param tokenUri The metadata URI associated with the token.
     * @param tokenId The ID of the token to be minted.
     */
    function _baseMint(
        uint256 tokenId,
        address to,
        string calldata tokenUri
    ) internal {
        // Ensure the total supply has not been exceeded
        if (totalSupply + 1 > parameters.info.maxTotalSupply) {
            revert TotalSupplyLimitReached();
        }

        totalSupply++;
        metadataUri[tokenId] = tokenUri;

        _safeMint(to, tokenId);
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

        bytes32 referralCode = _parameters.referralCode;
        address refferalCreator = _factory.getReferralCreator(referralCode);

        uint256 feesToPlatform = fees;
        uint256 referralFees;
        if (referralCode != bytes32(0)) {
            referralFees = _factory.getReferralRate(
                _parameters.creator,
                referralCode,
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

        require(
            expectedPayingToken == _parameters.info.payingToken,
            TokenChanged(expectedPayingToken, _parameters.info.payingToken)
        );

        amount = expectedPayingToken == ETH_ADDRESS ? msg.value : price;

        require(amount == price, IncorrectETHAmountSent(amount));

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

    /// @dev Hook that is called before any token transfers, including minting and burning.
    /// @param from The address tokens are being transferred from.
    /// @param to The address tokens are being transferred to.
    /// @param id The token ID being transferred.
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 id
    ) internal override {
        super._beforeTokenTransfer(from, to, id);

        // Check if this is not a mint or burn operation, only a transfer.
        if (from != address(0) && to != address(0)) {
            if (!parameters.info.transferable) {
                revert NotTransferable();
            }

            _validateTransfer(msg.sender, from, to, id);
        }
    }

    /**
     * @notice Validates the signature for a dynamic price minting transaction.
     * @param params The parameters of the minting operation.
     */
    function _validatePriceSignature(
        DynamicPriceParameters calldata params
    ) private view {
        _isSignatureValid(
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
        );
    }

    /**
     * @notice Validates the signature for a static price minting transaction.
     * @param params The parameters of the minting operation.
     */
    function _validatePriceSignature(
        StaticPriceParameters calldata params
    ) private view {
        _isSignatureValid(
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
        );
    }

    function _isSignatureValid(
        bytes32 _hash,
        bytes calldata signature
    ) private view {
        require(
            NFTFactory(parameters.factory)
                .nftFactoryParameters()
                .signerAddress
                .isValidSignatureNow(_hash, signature),
            InvalidSignature()
        );
    }
}
