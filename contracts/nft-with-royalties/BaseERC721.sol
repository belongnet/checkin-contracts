// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {ERC721Royalty, ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";

import {CreatorToken} from "./utils/CreatorToken.sol";
import {AutoValidatorTransferApprove} from "./utils/AutoValidatorTransferApprove.sol";

import {NftParameters} from "./Structures.sol";
import {ITransferValidator721} from "./interfaces/ITransferValidator721.sol";
import {ICreatorToken, ILegacyCreatorToken} from "./interfaces/ICreatorToken.sol";

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
    ERC721Royalty,
    Ownable,
    CreatorToken,
    AutoValidatorTransferApprove
{
    /// @notice The current total supply of tokens.
    uint256 public totalSupply;

    /// @notice Mapping of token ID to its metadata URI.
    mapping(uint256 => string) public metadataUri;

    /// @notice Mapping of token ID to its creation timestamp.
    mapping(uint256 => uint256) public creationTs;

    /// @notice Modifier to check if the provided address is not a zero address.
    /// @param _address The address to check.
    modifier zeroAddressCheck(address _address) {
        if (_address == address(0)) {
            revert ZeroAddressPasted();
        }
        _;
    }

    /**
     * @notice Constructor for BaseERC721.
     * @dev Initializes the contract with the given parameters, sets royalty information, and the transfer validator.
     * @param _params The NFT parameters struct containing details like name, symbol, fee receiver, etc.
     * @param newValidator The address of the transfer validator.
     */
    constructor(
        NftParameters memory _params,
        ITransferValidator721 newValidator
    )
        zeroAddressCheck(_params.info.payingToken)
        zeroAddressCheck(_params.storageContract)
        zeroAddressCheck(_params.info.feeReceiver)
        zeroAddressCheck(_params.creator)
        ERC721(_params.info.name, _params.info.symbol)
    {
        _initializeOwner(_params.platform);

        _setDefaultRoyalty(_params.info.feeReceiver, _params.info.feeNumerator);
        _setTransferValidator(newValidator);
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
     * @notice Checks if an operator is approved to manage all tokens of a given owner.
     * @dev Overrides the default behavior to automatically approve the transfer validator if enabled.
     * @param _owner The owner of the tokens.
     * @param operator The operator trying to manage the tokens.
     * @return isApproved Whether the operator is approved for all tokens of the owner.
     */
    function isApprovedForAll(
        address _owner,
        address operator
    ) public view virtual override returns (bool isApproved) {
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

    /**
     * @notice Internal function to handle updates during transfers.
     * @dev Validates transfers using the transfer validator, ensuring the transfer is allowed.
     * @param to The address to transfer the token to.
     * @param tokenId The ID of the token to transfer.
     * @param auth The authorized caller of the function.
     * @return from The address of the current token holder.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address from) {
        from = super._update(to, tokenId, auth);

        // Check if this is not a mint or burn operation, only a transfer.
        if (from != address(0) && to != address(0)) {
            _validateTansfer(msg.sender, from, to, tokenId);
        }
    }

    /**
     * @notice Checks if the contract supports a given interface.
     * @param interfaceId The interface ID to check.
     * @return Whether the interface is supported by the contract.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC2981).interfaceId ||
            interfaceId == type(ICreatorToken).interfaceId ||
            interfaceId == type(ILegacyCreatorToken).interfaceId ||
            interfaceId == 0x49064906 || // ERC4906
            super.supportsInterface(interfaceId);
    }
}
