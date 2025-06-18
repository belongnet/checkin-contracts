// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {EnumerableRoles} from "solady/src/auth/EnumerableRoles.sol";
import {ERC1155} from "solady/src/tokens/ERC1155.sol";

contract VenueToken is Initializable, ERC1155, Ownable, EnumerableRoles {
    event TokenUriSet(uint256 tokenId, string tokenUri);

    uint256 public constant DEFAULT_ADMIN_ROLE =
        uint256(keccak256("DEFAULT_ADMIN_ROLE"));
    uint256 public constant URI_SETTER_ROLE =
        uint256(keccak256("URI_SETTER_ROLE"));
    uint256 public constant MINTER_BURNER_ROLE =
        uint256(keccak256("MINTER_BURNER_ROLE"));

    string private _uri;
    mapping(uint256 tokenId => string tokenUri) private _tokenUri;

    function initialize(address _owner) external initializer {
        _setOwner(_owner);
        _setRole(_owner, DEFAULT_ADMIN_ROLE, true);
        _setRole(_owner, URI_SETTER_ROLE, true);
        _setRole(_owner, MINTER_BURNER_ROLE, true);
    }

    function setURI(string memory newUri) public onlyRole(URI_SETTER_ROLE) {
        _uri = newUri;
    }

    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        string calldata tokenUri
    ) public onlyRole(MINTER_BURNER_ROLE) {
        _setTokenUri(tokenId, tokenUri);
        _mint(to, tokenId, amount, "0x");
    }

    function burn(
        address from,
        uint256 tokenId,
        uint256 amount
    ) public onlyRole(MINTER_BURNER_ROLE) {
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
