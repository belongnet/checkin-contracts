// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC721RoyaltyUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721RoyaltyUpgradeable.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {CreatorToken} from "./utils/CreatorToken.sol";
import {AutoValidatorTransferApprove} from "./utils/AutoValidatorTransferApprove.sol";

import {NftParameters} from "./Structures.sol";
import {ITransferValidator721} from "./interfaces/ITransferValidator721.sol";
import {ICreatorToken, ILegacyCreatorToken} from "./interfaces/ICreatorToken.sol";

error ZeroAddressPasted();
error NotTransferable();

abstract contract BaseERC721 is
    ERC721RoyaltyUpgradeable,
    OwnableUpgradeable,
    CreatorToken,
    AutoValidatorTransferApprove
{
    uint256 public totalSupply; // The current totalSupply

    mapping(uint256 => string) public metadataUri; // token ID -> metadata link

    modifier zeroAddressCheck(address _address) {
        if (_address == address(0)) {
            revert ZeroAddressPasted();
        }
        _;
    }

    // constructor() {
    //     _disableInitializers();
    // }

    function __ERC721Base_init(
        NftParameters memory _params,
        ITransferValidator721 newValidator
    ) internal onlyInitializing {
        __ERC721_init(_params.info.name, _params.info.symbol);
        __Ownable_init(_params.creator);
        __ERC2981_init();
        __ERC721Royalty_init();

        _setDefaultRoyalty(_params.info.feeReceiver, _params.info.feeNumerator);
        _setTransferValidator(newValidator);
    }

    /**
     * @notice Mints new NFT
     * @dev Requires a signature from the trusted address
     * @param to Address that gets ERC721 token
     * @param tokenUri Metadata URI of the ERC721 token
     */
    function mint_(
        uint256 tokenId,
        address to,
        string calldata tokenUri
    ) internal {
        totalSupply++;
        metadataUri[tokenId] = tokenUri;

        _safeMint(to, tokenId);
    }

    /**
     * @notice Set the transfer validator. Only callable by the token owner.
     */
    function setTransferValidator(
        ITransferValidator721 newValidator
    ) external onlyOwner {
        // Set the new transfer validator.
        _setTransferValidator(newValidator);
    }

    /**
     * @notice Sets if the transfer validator is automatically approved as an operator for all token owners.
     *
     * @dev    Throws when the caller is not the contract owner.
     *
     * @param autoApprove If true, the collection's transfer validator will be automatically approved to
     *                    transfer holder's tokens.
     */
    function setAutomaticApprovalOfTransfersFromValidator(
        bool autoApprove
    ) external onlyOwner {
        _setAutomaticApprovalOfTransfersFromValidator(autoApprove);
    }

    /**
     * @notice Overrides behavior of isApprovedFor all such that if an operator is not explicitly approved
     *         for all, the contract owner can optionally auto-approve the 721-C transfer validator for transfers.
     */
    function isApprovedForAll(
        address _owner,
        address operator
    ) public view virtual override returns (bool isApproved) {
        isApproved = super.isApprovedForAll(_owner, operator);

        if (!isApproved) {
            if (autoApproveTransfersFromValidator) {
                isApproved = operator == address(_transferValidator);
            }
        }
    }

    /**
     * @notice Returns metadata link for specified ID
     * @param _tokenId Token ID
     */

    function tokenURI(
        uint256 _tokenId
    ) public view override returns (string memory) {
        return metadataUri[_tokenId];
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address from) {
        from = super._update(to, tokenId, auth);

        // Check if the tx is not a mint/burn, only transfer
        if (from != address(0) && to != address(0)) {
            _validateTansfer(msg.sender, from, to, tokenId);
        }
    }

    /**
     * @notice Returns whether the interface is supported.
     *
     * @param interfaceId The interface id to check against.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC2981).interfaceId ||
            interfaceId == type(ICreatorToken).interfaceId ||
            interfaceId == type(ILegacyCreatorToken).interfaceId ||
            interfaceId == 0x49064906 || // ERC-4906
            super.supportsInterface(interfaceId);
    }
}
