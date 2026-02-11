// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ERC721} from "solady/src/tokens/ERC721.sol";
import {ERC2981} from "solady/src/tokens/ERC2981.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

import {AddressHelper} from "./utils/AddressHelper.sol";
import {CreatorToken} from "../utils/CreatorToken.sol";
import {NFTFactory, InstanceInfo} from "./factories/NFTFactory.sol";
import {StaticPriceParameters, DynamicPriceParameters, InvalidSignature} from "./Structures.sol";

// ========== Errors ==========

/// @notice Error thrown when insufficient ETH is sent for a minting transaction.
/// @param ETHsent The amount of ETH sent.
error IncorrectETHAmountSent(uint256 ETHsent);

/// @notice Error thrown when the mint price changes unexpectedly.
/// @param currentPrice The actual current mint price.
error PriceChanged(uint256 currentPrice);

/// @notice Error thrown when the paying token changes unexpectedly.
/// @param currentPayingToken The actual current paying token.
error TokenChanged(address currentPayingToken);

/// @notice Error thrown when an array exceeds the maximum allowed size.
error WrongArraySize();

/// @notice Thrown when an unauthorized transfer attempt is made.
error NotTransferable();

/// @notice Error thrown when the total supply limit is reached.
error TotalSupplyLimitReached();

/// @notice Error thrown when the token id is not exist.
error TokenIdDoesNotExist();

/**
 * @title NftParameters
 * @notice A struct that contains all necessary parameters for creating an NFT collection.
 * @dev This struct is used to pass parameters between contracts during the creation of a new NFT collection.
 */
struct NftParameters {
    /// @notice The address of the contract used to validate token transfers.
    address transferValidator;
    /// @notice The address of the factory contract where the NFT collection is created.
    address factory;
    /// @notice The address of the creator of the NFT collection.
    address creator;
    /// @notice The address that will receive the royalties from secondary sales.
    address feeReceiver;
    /// @notice The referral code associated with the NFT collection.
    bytes32 referralCode;
    /// @notice The detailed information about the NFT collection, including its properties and configuration.
    InstanceInfo info;
}

/**
 * @title NFT Contract
 * @notice Implements the minting and transfer functionality for NFTs, including transfer validation and royalty management.
 * @dev This contract inherits from BaseERC721 and implements additional minting logic, including whitelist support and fee handling.
 */
contract NFT is ERC721, ERC2981, Ownable, CreatorToken {
    using AddressHelper for address;
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
    /// @param autoApproved The new value of the automatic approval flag.
    event NftParametersChanged(address newToken, uint256 newPrice, uint256 newWLPrice, bool autoApproved);

    // ========== State Variables ==========

    /// @notice The constant address representing ETH.
    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /// @notice The current total supply of tokens.
    uint256 public totalSupply;

    /// @notice If true, the collection's transfer validator is automatically approved to transfer token holders' tokens.
    bool private autoApproveTransfersFromValidator;

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

        if (_params.info.feeNumerator > 0) {
            _setDefaultRoyalty(_params.feeReceiver, _params.info.feeNumerator);
        }

        _setTransferValidator(_params.transferValidator);

        _initializeOwner(_params.creator);
    }

    // ========== Functions ==========

    /**
     * @notice Sets a new paying token and mint prices for the collection.
     * @dev Can only be called by the contract owner.
     * @param _payingToken The new paying token address.
     * @param _mintPrice The new mint price.
     * @param _whitelistMintPrice The new whitelist mint price.
     * @param autoApprove If true, the transfer validator will be automatically approved for all token holders.
     */
    function setNftParameters(address _payingToken, uint128 _mintPrice, uint128 _whitelistMintPrice, bool autoApprove)
        external
        onlyOwner
    {
        parameters.info.payingToken = _payingToken;
        parameters.info.mintPrice = _mintPrice;
        parameters.info.whitelistMintPrice = _whitelistMintPrice;

        autoApproveTransfersFromValidator = autoApprove;

        emit NftParametersChanged(_payingToken, _mintPrice, _whitelistMintPrice, autoApprove);
    }

    /**
     * @notice Mints new NFTs with static prices to a specified receiver.
     * @dev Requires signatures from a trusted signer and validates whitelist status per item.
     *      Reverts if `paramsArray.length` exceeds factory `maxArraySize`.
     * @param receiver The address that will receive all newly minted tokens.
     * @param paramsArray Array of parameters for each mint (tokenId, tokenUri, whitelisted, signature).
     * @param expectedPayingToken The expected token used for payments (ETH pseudo-address or ERC-20).
     * @param expectedMintPrice The expected total price for the minting operation.
     */
    function mintStaticPrice(
        address receiver,
        StaticPriceParameters[] calldata paramsArray,
        address expectedPayingToken,
        uint256 expectedMintPrice
    ) external payable {
        require(
            paramsArray.length <= NFTFactory(parameters.factory).nftFactoryParameters().maxArraySize, WrongArraySize()
        );

        InstanceInfo memory info = parameters.info;

        uint256 amountToPay;
        for (uint256 i = 0; i < paramsArray.length; ++i) {
            NFTFactory(parameters.factory).nftFactoryParameters().signerAddress
                .checkStaticPriceParameters(receiver, paramsArray[i]);

            // Determine the mint price based on whitelist status
            uint256 price = paramsArray[i].whitelisted ? info.whitelistMintPrice : info.mintPrice;

            unchecked {
                amountToPay += price;
            }

            _baseMint(paramsArray[i].tokenId, receiver, paramsArray[i].tokenUri);
        }

        require(_pay(amountToPay, expectedPayingToken) == expectedMintPrice, PriceChanged(expectedMintPrice));
    }

    /**
     * @notice Mints new NFTs with dynamic prices to a specified receiver.
     * @dev Requires signatures from a trusted signer. Each item provides its own price.
     *      Reverts if `paramsArray.length` exceeds factory `maxArraySize`.
     * @param receiver The address that will receive all newly minted tokens.
     * @param paramsArray Array of parameters for each mint (tokenId, tokenUri, price, signature).
     * @param expectedPayingToken The expected token used for payments (ETH pseudo-address or ERC-20).
     */
    function mintDynamicPrice(
        address receiver,
        DynamicPriceParameters[] calldata paramsArray,
        address expectedPayingToken
    ) external payable {
        require(
            paramsArray.length <= NFTFactory(parameters.factory).nftFactoryParameters().maxArraySize, WrongArraySize()
        );

        uint256 amountToPay;
        for (uint256 i = 0; i < paramsArray.length; ++i) {
            NFTFactory(parameters.factory).nftFactoryParameters().signerAddress
                .checkDynamicPriceParameters(receiver, paramsArray[i]);

            unchecked {
                amountToPay += paramsArray[i].price;
            }

            _baseMint(paramsArray[i].tokenId, receiver, paramsArray[i].tokenUri);
        }

        _pay(amountToPay, expectedPayingToken);
    }

    /**
     * @notice Returns the metadata URI for a specific token ID.
     * @param _tokenId The ID of the token.
     * @return The metadata URI associated with the given token ID.
     */
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        if (!_exists(_tokenId)) {
            revert TokenIdDoesNotExist();
        }

        return metadataUri[_tokenId];
    }

    /// @notice Returns the name of the token collection.
    /// @return The name of the token.
    function name() public view override returns (string memory) {
        return parameters.info.metadata.name;
    }

    /// @notice Returns the symbol of the token collection.
    /// @return The symbol of the token.
    function symbol() public view override returns (string memory) {
        return parameters.info.metadata.symbol;
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
    function isApprovedForAll(address _owner, address operator) public view override returns (bool isApproved) {
        isApproved = super.isApprovedForAll(_owner, operator);

        if (!isApproved && autoApproveTransfersFromValidator) {
            isApproved = operator == address(_transferValidator);
        }
    }

    /// @dev Returns true if this contract implements the interface defined by `interfaceId`.
    /// See: https://eips.ethereum.org/EIPS/eip-165
    /// This function call must use less than 30000 gas.
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981) returns (bool) {
        bool result;
        /// @solidity memory-safe-assembly
        assembly {
            let s := shr(224, interfaceId)
            // ICreatorToken: 0xad0d7f6c, ILegacyCreatorToken: 0xa07d229a.
            // ERC4906: 0x49064906, check https://eips.ethereum.org/EIPS/eip-4906.
            result := or(or(eq(s, 0xad0d7f6c), eq(s, 0xa07d229a)), eq(s, 0x49064906))
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
    function _baseMint(uint256 tokenId, address to, string calldata tokenUri) internal {
        // Ensure the total supply has not been exceeded
        require(totalSupply + 1 <= parameters.info.maxTotalSupply, TotalSupplyLimitReached());
        // Overflow check required: The rest of the code assumes that totalSupply never overflows
        unchecked {
            totalSupply++;
        }

        metadataUri[tokenId] = tokenUri;
        _safeMint(to, tokenId);
    }

    /**
     * @notice Handles payment routing for mints (ETH or ERC-20), splitting platform and referral fees.
     * @dev Validates that `expectedPayingToken` matches configured currency; emits {Paid}.
     * @param price Total expected amount to charge.
     * @param expectedPayingToken Expected payment currency (ETH pseudo-address or ERC-20).
     * @return amount Amount actually charged (wei or token units).
     */
    function _pay(uint256 price, address expectedPayingToken) private returns (uint256 amount) {
        NftParameters memory _parameters = parameters;

        require(expectedPayingToken == _parameters.info.payingToken, TokenChanged(_parameters.info.payingToken));

        amount = expectedPayingToken == ETH_ADDRESS ? msg.value : price;

        require(amount == price, IncorrectETHAmountSent(amount));

        NFTFactory _factory = NFTFactory(_parameters.factory);

        uint256 fees;
        uint256 amountToCreator;
        unchecked {
            fees = (amount * _factory.nftFactoryParameters().platformCommission) / _feeDenominator();

            amountToCreator = amount - fees;
        }

        bytes32 referralCode = _parameters.referralCode;
        address refferalCreator = _factory.getReferralCreator(referralCode);

        uint256 feesToPlatform = fees;
        uint256 referralFees;
        if (referralCode != bytes32(0)) {
            referralFees = _factory.getReferralRate(_parameters.creator, referralCode, fees);
            unchecked {
                feesToPlatform -= referralFees;
            }
        }

        if (expectedPayingToken == ETH_ADDRESS) {
            if (feesToPlatform > 0) {
                _factory.nftFactoryParameters().platformAddress.safeTransferETH(feesToPlatform);
            }
            if (referralFees > 0) {
                refferalCreator.safeTransferETH(referralFees);
            }

            _parameters.creator.safeTransferETH(amountToCreator);
        } else {
            if (feesToPlatform > 0) {
                expectedPayingToken.safeTransferFrom(
                    msg.sender, _factory.nftFactoryParameters().platformAddress, feesToPlatform
                );
            }
            if (referralFees > 0) {
                expectedPayingToken.safeTransferFrom(msg.sender, refferalCreator, referralFees);
            }

            expectedPayingToken.safeTransferFrom(msg.sender, _parameters.creator, amountToCreator);
        }

        emit Paid(msg.sender, expectedPayingToken, amount);
    }

    /// @dev Hook that is called before any token transfers, including minting and burning.
    /// @param from The address tokens are being transferred from.
    /// @param to The address tokens are being transferred to.
    /// @param id The token ID being transferred.
    function _beforeTokenTransfer(address from, address to, uint256 id) internal override {
        super._beforeTokenTransfer(from, to, id);

        // Check if this is not a mint or burn operation, only a transfer.
        if (from != address(0) && to != address(0)) {
            require(parameters.info.transferable, NotTransferable());

            _validateTransfer(msg.sender, from, to, id);
        }
    }
}
