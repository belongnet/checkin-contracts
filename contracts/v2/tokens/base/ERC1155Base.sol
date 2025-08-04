// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {EnumerableRoles} from "solady/src/auth/EnumerableRoles.sol";
import {ERC1155} from "solady/src/tokens/ERC1155.sol";

import {ERC1155Info} from "../../Structures.sol";

contract ERC1155Base is Initializable, ERC1155, Ownable, EnumerableRoles {
    error TokenCanNotBeTransfered();

    event UriSet(string uri);
    event TokenUriSet(uint256 tokenId, string tokenUri);
    event TransferableSet(bool transferable);

    uint256 public constant DEFAULT_ADMIN_ROLE =
        uint256(keccak256("DEFAULT_ADMIN_ROLE"));
    uint256 public constant MANAGER_ROLE = uint256(keccak256("MANAGER_ROLE"));
    uint256 public constant MINTER_ROLE = uint256(keccak256("MINTER_ROLE"));
    uint256 public constant BURNER_ROLE = uint256(keccak256("BURNER_ROLE"));

    string public name;
    string public symbol;

    bool public transferable;
    string private _uri;
    mapping(uint256 tokenId => string tokenUri) private _tokenUri;

    function _initialize_ERC1155Base(ERC1155Info calldata info) internal {
        name = info.name;
        symbol = info.symbol;

        _setOwner(info.defaultAdmin);
        _setRole(info.defaultAdmin, DEFAULT_ADMIN_ROLE, true);
        _setRole(info.manager, MANAGER_ROLE, true);
        _setRole(info.minter, MINTER_ROLE, true);
        _setRole(info.burner, BURNER_ROLE, true);

        _setUri(info.uri);
        _setTransferable(info.transferable);
    }

    function setURI(string calldata uri_) public onlyRole(MANAGER_ROLE) {
        _setUri(uri_);
    }

    function setTransferable(bool _transferable) public onlyRole(MANAGER_ROLE) {
        _setTransferable(_transferable);
    }

    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        string calldata tokenUri
    ) public onlyRole(MINTER_ROLE) {
        _setTokenUri(tokenId, tokenUri);
        _mint(to, tokenId, amount, "0x");
    }

    function burn(
        address from,
        uint256 tokenId,
        uint256 amount
    ) public onlyRole(BURNER_ROLE) {
        _setTokenUri(tokenId, "");
        _mint(from, tokenId, amount, "0x");
    }

    function _setUri(string calldata uri_) private {
        _uri = uri_;
        emit UriSet(uri_);
    }

    function _setTokenUri(uint256 tokenId, string memory tokenUri) private {
        _tokenUri[tokenId] = tokenUri;
        emit TokenUriSet(tokenId, tokenUri);
    }

    function _setTransferable(bool _transferable) private {
        transferable = _transferable;
        emit TransferableSet(_transferable);
    }

    /// @dev Hook that is called before any token transfer.
    /// This includes minting and burning, as well as batched variants.
    ///
    /// The same hook is called on both single and batched variants.
    /// For single transfers, the length of the `id` and `amount` arrays are 1.
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override {
        if(from != address(0)) {
            require(transferable, TokenCanNotBeTransfered());
        }

        super._beforeTokenTransfer(from, to, ids, amounts, data);
    }

    function uri() public view returns (string memory) {
        return _uri;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return _tokenUri[tokenId];
    }

    /// @dev Override this function to return true if `_beforeTokenTransfer` is used.
    /// This is to help the compiler avoid producing dead bytecode.
    function _useBeforeTokenTransfer() internal pure override returns (bool) {
        return true;
    }
}
