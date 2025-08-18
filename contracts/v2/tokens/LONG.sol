// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity 0.8.27;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Bridgeable} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Bridgeable.sol";

/// @title LONG
/// @notice ERC-20 token with burn, pause, permit, and bridge authorization for Superchain deployments.
/// @dev
/// - Mints a fixed initial supply to `mintTo` in the constructor.
/// - `pause`/`unpause` restricted to `PAUSER_ROLE`.
/// - Enforces bridge calls to come only from the predeployed `SuperchainTokenBridge`.
contract LONG is ERC20, ERC20Bridgeable, ERC20Burnable, ERC20Pausable, AccessControl, ERC20Permit {
    /// @notice Revert used by bridge guard and role checks.
    error Unauthorized();

    /// @notice Predeployed SuperchainTokenBridge address (only this may call bridge hooks).
    address internal constant SUPERCHAIN_TOKEN_BRIDGE = 0x4200000000000000000000000000000000000028;

    /// @notice Role identifier for pausing/unpausing transfers.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Deploys LONG and mints initial supply to `mintTo`; sets admin and pauser roles.
    /// @param mintTo Recipient of the initial token supply.
    /// @param defaultAdmin Address granted `DEFAULT_ADMIN_ROLE`.
    /// @param pauser Address granted `PAUSER_ROLE`.
    constructor(address mintTo, address defaultAdmin, address pauser) ERC20("LONG", "LONG") ERC20Permit("LONG") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, pauser);
        _mint(mintTo, 750000000 * 10 ** decimals());
    }

    /// @notice Bridge guard: ensures only the canonical Superchain bridge may call.
    /// @dev Overridden from `ERC20Bridgeable`.
    /// @param caller The caller address to validate.
    function _checkTokenBridge(address caller) internal pure override {
        if (caller != SUPERCHAIN_TOKEN_BRIDGE) revert Unauthorized();
    }

    /// @notice Pause token transfers and approvals.
    /// @dev Callable by addresses holding `PAUSER_ROLE`.
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause token transfers and approvals.
    /// @dev Callable by addresses holding `PAUSER_ROLE`.
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @inheritdoc ERC20
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }

    /// @inheritdoc ERC20Bridgeable
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC20Bridgeable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
