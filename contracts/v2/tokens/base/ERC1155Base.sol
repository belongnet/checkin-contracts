// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {EnumerableRoles} from "solady/src/auth/EnumerableRoles.sol";
import {ERC1155} from "solady/src/tokens/ERC1155.sol";

import {ERC1155Info} from "../../Structures.sol";

/// @title ERC1155Base
/// @notice Base upgradeable ERC-1155 with role-gated admin, manager, minter and burner flows,
///         collection-level URI, per-token URI, and a global transferability switch.
/// @dev
/// - Uses Solady's `EnumerableRoles` for role management with custom 256-bit role IDs.
/// - `transferable` gate is enforced in `_beforeTokenTransfer` for non-mint/burn transfers.
/// - Initialize via `_initialize_ERC1155Base(ERC1155Info)` in child `initialize`.
contract ERC1155Base is Initializable, ERC1155, Ownable, EnumerableRoles {
    /// @notice Thrown when attempting to transfer tokens while `transferable` is false.
    error TokenCanNotBeTransfered();

    /// @notice Emitted when the collection-level URI is updated.
    /// @param uri New collection URI.
    event UriSet(string uri);

    /// @notice Emitted when a token-specific URI is updated.
    /// @param tokenId The token id whose URI changed.
    /// @param tokenUri New token URI.
    event TokenUriSet(uint256 tokenId, string tokenUri);

    /// @notice Emitted when the global transferability flag is updated.
    /// @param transferable New transferability value.
    event TransferableSet(bool transferable);

    /// @notice Role: default admin.
    uint256 public constant DEFAULT_ADMIN_ROLE = uint256(keccak256("DEFAULT_ADMIN_ROLE"));
    /// @notice Role: collection manager (URI/transferability).
    uint256 public constant MANAGER_ROLE = uint256(keccak256("MANAGER_ROLE"));
    /// @notice Role: minter (mint).
    uint256 public constant MINTER_ROLE = uint256(keccak256("MINTER_ROLE"));
    /// @notice Role: burner (burn).
    uint256 public constant BURNER_ROLE = uint256(keccak256("BURNER_ROLE"));

    /// @notice Human-readable collection name.
    string public name;
    /// @notice Human-readable collection symbol.
    string public symbol;

    /// @notice Global flag controlling whether user-to-user transfers are allowed.
    bool public transferable;

    /// @dev Collection-level base URI.
    string private _uri;

    /// @dev Per-token URI overrides.
    mapping(uint256 tokenId => string tokenUri) private _tokenUri;

    /// @notice Initializes base ERC-1155 state (roles, URIs, transferability).
    /// @dev Must be called exactly once by derived `initialize`.
    /// @param info Initialization payload (roles, URIs, flags, metadata).
    function _initialize_ERC1155Base(ERC1155Info calldata info) internal {
        name = info.name;
        symbol = info.symbol;

        _initializeOwner(info.defaultAdmin);
        _setRole(info.defaultAdmin, DEFAULT_ADMIN_ROLE, true);
        _setRole(info.manager, MANAGER_ROLE, true);
        _setRole(info.minter, MINTER_ROLE, true);
        _setRole(info.burner, BURNER_ROLE, true);

        _setUri(info.uri);
        _setTransferable(info.transferable);
    }

    /// @notice Updates the collection-level URI.
    /// @param uri_ New collection URI.
    function setURI(string calldata uri_) public onlyRole(MANAGER_ROLE) {
        _setUri(uri_);
    }

    /// @notice Updates the global transferability switch.
    /// @param _transferable New transferability value.
    function setTransferable(bool _transferable) public onlyRole(MANAGER_ROLE) {
        _setTransferable(_transferable);
    }

    /// @notice Mints `amount` of `tokenId` to `to` and sets its token URI.
    /// @param to Recipient address.
    /// @param tokenId Token id to mint.
    /// @param amount Amount to mint.
    /// @param tokenUri Token-specific URI to set (overrides collection URI).
    function mint(address to, uint256 tokenId, uint256 amount, string calldata tokenUri) public onlyRole(MINTER_ROLE) {
        _setTokenUri(tokenId, tokenUri);
        _mint(to, tokenId, amount, "0x");
    }

    /// @notice Burns `amount` of `tokenId` from `from` and clears its token URI.
    /// @param from Address to burn from.
    /// @param tokenId Token id to burn.
    /// @param amount Amount to burn.
    function burn(address from, uint256 tokenId, uint256 amount) public onlyRole(BURNER_ROLE) {
        _setTokenUri(tokenId, "");
        _burn(from, tokenId, amount);
    }

    /// @dev Internal setter for collection URI.
    /// @param uri_ New collection URI.
    function _setUri(string calldata uri_) private {
        _uri = uri_;
        emit UriSet(uri_);
    }

    /// @dev Internal setter for token-specific URI.
    /// @param tokenId Token id.
    /// @param tokenUri New token URI.
    function _setTokenUri(uint256 tokenId, string memory tokenUri) private {
        _tokenUri[tokenId] = tokenUri;
        emit TokenUriSet(tokenId, tokenUri);
    }

    /// @dev Internal setter for transferability flag.
    /// @param _transferable New transferability value.
    function _setTransferable(bool _transferable) private {
        transferable = _transferable;
        emit TransferableSet(_transferable);
    }

    /// @inheritdoc ERC1155
    /// @dev Reverts with `TokenCanNotBeTransfered()` for user-to-user transfers when `transferable` is false.
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override {
        if (from != address(0) && to != address(0)) {
            require(transferable, TokenCanNotBeTransfered());
        }

        super._beforeTokenTransfer(from, to, ids, amounts, data);
    }

    /// @notice Returns the collection-level URI.
    function uri() public view returns (string memory) {
        return _uri;
    }

    /// @inheritdoc ERC1155
    function uri(uint256 tokenId) public view override returns (string memory) {
        return _tokenUri[tokenId];
    }

    /// @inheritdoc ERC1155
    /// @dev Signals that `_beforeTokenTransfer` is used to help the compiler trim dead code.
    function _useBeforeTokenTransfer() internal pure override returns (bool) {
        return true;
    }
}
