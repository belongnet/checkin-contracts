// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {EnumerableRoles} from "solady/src/auth/EnumerableRoles.sol";
import {ERC1155} from "solady/src/tokens/ERC1155.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract CreditToken is Initializable, ERC1155, Ownable, EnumerableRoles {
    event TokenUriSet(uint256 tokenId, string tokenUri);

    uint256 public constant DEFAULT_ADMIN_ROLE =
        uint256(keccak256("DEFAULT_ADMIN_ROLE"));
    uint256 public constant URI_SETTER_ROLE =
        uint256(keccak256("URI_SETTER_ROLE"));
    uint256 public constant MINTER_ROLE = uint256(keccak256("MINTER_ROLE"));
    uint256 public constant BURNER_ROLE = uint256(keccak256("BURNER_ROLE"));
    uint256 public constant PAUSER_ROLE = uint256(keccak256("PAUSER_ROLE"));

    string private _uri;
    mapping(uint256 tokenId => string tokenUri) private _tokenUri;

    function initialize(
        address defaultAdmin,
        address uriSetter,
        address minter,
        address burner,
        address pauser
    ) external initializer {
        _setOwner(defaultAdmin);
        _setRole(defaultAdmin, DEFAULT_ADMIN_ROLE, true);
        _setRole(uriSetter, URI_SETTER_ROLE, true);
        _setRole(minter, MINTER_ROLE, true);
        _setRole(burner, BURNER_ROLE, true);
        _setRole(pauser, PAUSER_ROLE, true);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function setURI(string memory newUri) public onlyRole(URI_SETTER_ROLE) {
        _uri = newUri;
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

    function uri() public view returns (string memory) {
        return _uri;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return _tokenUri[tokenId];
    }

    function _setTokenUri(uint256 tokenId, string memory tokenUri) private {
        _tokenUri[tokenId] = tokenUri;
        emit TokenUriSet(tokenId, tokenUri);
    }
}
