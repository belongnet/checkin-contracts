// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ERC721} from "solady/src/tokens/ERC721.sol";
import {ERC2981} from "solady/src/tokens/ERC2981.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";

import {ITransferValidator721} from "./interfaces/ITransferValidator721.sol";
import {ICreatorToken, ILegacyCreatorToken} from "./interfaces/ICreatorToken.sol";

import {CreatorToken} from "./utils/CreatorToken.sol";
import {AutoValidatorTransferApprove} from "./utils/AutoValidatorTransferApprove.sol";

import {NftParameters} from "./Structures.sol";

/// @notice Thrown when a zero address is provided where it's not allowed.
error ZeroAddressPasted();

/// @notice Thrown when an unauthorized transfer attempt is made.
error NotTransferable();

/**
 * @title BaseERC721
 * @notice A base contract for ERC721 tokens that supports royalties, transfer validation, and metadata management.
 * @dev This contract extends the OpenZeppelin ERC721Royalty and Solady Ownable contracts and adds support for transfer validation.
 */
abstract contract BaseERC721 is
    ERC721,
    ERC2981,
    Ownable,
    CreatorToken,
    AutoValidatorTransferApprove
{
    /// @notice Emitted when the paying token and prices are updated.
    /// @param newToken The address of the new paying token.
    /// @param newPrice The new mint price.
    /// @param newWLPrice The new whitelist mint price.
    event PayingTokenChanged(
        address newToken,
        uint256 newPrice,
        uint256 newWLPrice
    );

    /// @notice The current total supply of tokens.
    uint256 public totalSupply;

    /// @notice Mapping of token ID to its metadata URI.
    mapping(uint256 => string) public metadataUri;

    /// @notice Mapping of token ID to its creation timestamp.
    mapping(uint256 => uint256) public creationTs;

    /// @notice The struct containing all NFT parameters for the collection.
    NftParameters public parameters;

    /**
     * @notice Constructor for BaseERC721.
     * @dev Initializes the contract with the given parameters, sets royalty information, and the transfer validator.
     * @param _params The NFT parameters struct containing details like name, symbol, fee receiver, etc.
     * @param newValidator The address of the transfer validator.
     */
    constructor(
        NftParameters memory _params,
        ITransferValidator721 newValidator
    ) {
        parameters = _params;

        _setDefaultRoyalty(_params.info.feeReceiver, _params.info.feeNumerator);
        _setTransferValidator(newValidator);

        _initializeOwner(_params.creator);
    }

    /**
     * @notice Sets a new transfer validator for the token.
     * @dev Can only be called by the contract owner.
     * @param newValidator The new transfer validator contract.
     */
    function setTransferValidator(
        ITransferValidator721 newValidator
    ) external onlyOwner {
        _setTransferValidator(newValidator);
    }

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
        uint256 _mintPrice,
        uint256 _whitelistMintPrice
    ) external onlyOwner {
        if (_payingToken == address(0)) {
            revert ZeroAddressPasted();
        }

        parameters.info.payingToken = _payingToken;
        parameters.info.mintPrice = _mintPrice;
        parameters.info.whitelistMintPrice = _whitelistMintPrice;

        emit PayingTokenChanged(_payingToken, _mintPrice, _whitelistMintPrice);
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

    /**
     * @notice Returns the metadata URI for a specific token ID.
     * @param _tokenId The ID of the token.
     * @return The metadata URI associated with the given token ID.
     */
    function tokenURI(
        uint256 _tokenId
    ) public view override returns (string memory) {
        return metadataUri[_tokenId];
    }

    /**
     * @notice Retrieves the payment receipt for a specific token ID.
     * @param tokenId The ID of the token.
     * @return The payment amount associated with the token.
     */
    function getReceipt(uint256 tokenId) external view returns (uint96) {
        return _getExtraData(tokenId);
    }

    /// @notice Returns the symbol of the token collection.
    function symbol() public view override returns (string memory) {
        return parameters.info.symbol;
    }

    /// @notice Returns the name of the token collection.
    function name() public view override returns (string memory) {
        return parameters.info.name;
    }

    /**
     * @notice Returns the paying token for the collection.
     */
    function payingToken() external view returns (address) {
        return parameters.info.payingToken;
    }

    /**
     * @notice Returns the address of the factory contract.
     */
    function factory() external view returns (address) {
        return parameters.factory;
    }

    /**
     * @notice Returns the current mint price for the collection.
     */
    function mintPrice() external view returns (uint256) {
        return parameters.info.mintPrice;
    }

    /**
     * @notice Returns the current whitelist mint price for the collection.
     */
    function whitelistMintPrice() external view returns (uint256) {
        return parameters.info.whitelistMintPrice;
    }

    /**
     * @notice Returns whether the collection is transferable.
     */
    function transferable() external view returns (bool) {
        return parameters.info.transferable;
    }

    /**
     * @notice Returns the maximum total supply for the collection.
     */
    function maxTotalSupply() external view returns (uint256) {
        return parameters.info.maxTotalSupply;
    }

    /**
     * @notice Returns the total royalty percentage for the collection.
     */
    function totalRoyalty() external view returns (uint256) {
        return parameters.info.feeNumerator;
    }

    /**
     * @notice Returns the creator of the collection.
     */
    function creator() external view returns (address) {
        return parameters.creator;
    }

    /**
     * @notice Returns the expiration timestamp for the collection.
     */
    function collectionExpire() external view returns (uint256) {
        return parameters.info.collectionExpire;
    }

    /**
     * @notice Returns the contract URI for the collection.
     */
    function contractURI() external view returns (string memory) {
        return parameters.info.contractURI;
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
        totalSupply++;
        metadataUri[tokenId] = tokenUri;
        creationTs[tokenId] = block.timestamp;

        _safeMint(to, tokenId);
    }

    /// @dev Hook that is called before any token transfers, including minting and burning.
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

            _validateTansfer(msg.sender, from, to, id);
        }
    }

    /**
     * @notice Checks if the contract supports a given interface.
     * @param interfaceId The interface ID to check.
     * @return Whether the interface is supported by the contract.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, ERC2981) returns (bool) {
        return
            interfaceId == type(ICreatorToken).interfaceId ||
            interfaceId == type(ILegacyCreatorToken).interfaceId ||
            interfaceId == 0x49064906 || // ERC4906
            super.supportsInterface(interfaceId);
    }
}
