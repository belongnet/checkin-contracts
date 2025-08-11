// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity 0.8.27;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Bridgeable} from "./base/ERC20Bridgeable.sol";

contract LONG is
    ERC20,
    ERC20Bridgeable,
    ERC20Burnable,
    ERC20Pausable,
    AccessControl,
    ERC20Permit
{
    error Unauthorized();

    address internal constant SUPERCHAIN_TOKEN_BRIDGE =
        0x4200000000000000000000000000000000000028;
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    constructor(
        address mintTo,
        address defaultAdmin,
        address pauser
    ) ERC20("LONG", "LONG") ERC20Permit("LONG") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, pauser);
        _mint(mintTo, 750000000 * 10 ** decimals());
    }

    /**
     * @dev Checks if the caller is the predeployed SuperchainTokenBridge. Reverts otherwise.
     *
     * IMPORTANT: The predeployed SuperchainTokenBridge is only available on chains in the Superchain.
     */
    function _checkTokenBridge(address caller) internal pure override {
        if (caller != SUPERCHAIN_TOKEN_BRIDGE) revert Unauthorized();
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // The following functions are overrides required by Solidity.
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC20Bridgeable, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
