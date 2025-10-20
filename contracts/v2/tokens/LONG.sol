// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
pragma solidity 0.8.27;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {
    ERC20BridgeableUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20BridgeableUpgradeable.sol";
import {
    ERC20BurnableUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import {
    ERC20PausableUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import {
    ERC20PermitUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title LONG
/// @notice ERC-20 token with burn, pause, permit, and bridge authorization for Superchain deployments.
/// @dev
/// - Mints a fixed initial supply to `mintTo` in the constructor.
/// - `pause`/`unpause` restricted to `PAUSER_ROLE`.
/// - Enforces bridge calls to come only from the predeployed `SuperchainTokenBridge`.
contract LONG is
    Initializable,
    ERC20Upgradeable,
    ERC20BridgeableUpgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    AccessControlUpgradeable,
    ERC20PermitUpgradeable
{
    /// @notice Revert used by bridge guard and role checks.
    error Unauthorized();

    /// @notice Predeployed SuperchainTokenBridge address (only this may call bridge hooks).
    address internal constant SUPERCHAIN_TOKEN_BRIDGE = 0x4200000000000000000000000000000000000028;

    /// @notice Role identifier for pausing/unpausing transfers.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes LONG and mints initial supply to `recipient`; sets admin and pauser roles.
    /// @param recipient Recipient of the initial token supply.
    /// @param defaultAdmin Address granted `DEFAULT_ADMIN_ROLE`.
    /// @param pauser Address granted `PAUSER_ROLE`.
    function initialize(address recipient, address defaultAdmin, address pauser) public initializer {
        __ERC20_init("LONG", "LONG");
        __ERC20Bridgeable_init();
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControl_init();
        __ERC20Permit_init("LONG");

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, pauser);

        _mint(recipient, 750000000 * 10 ** decimals());
    }

    /**
     * @dev Checks if the caller is the predeployed SuperchainTokenBridge. Reverts otherwise.
     *
     * IMPORTANT: The predeployed SuperchainTokenBridge is only available on chains in the Superchain.
     */
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

    // The following functions are overrides required by Solidity.

    /// @inheritdoc ERC20Upgradeable
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        super._update(from, to, value);
    }

    /// @inheritdoc ERC20BridgeableUpgradeable
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC20BridgeableUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
