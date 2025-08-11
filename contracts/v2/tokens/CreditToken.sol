// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {ERC1155Base} from "./base/ERC1155Base.sol";
import {ERC1155Info} from "../Structures.sol";

/// @title CreditToken
/// @notice Minimal-proxy (cloneable) ERC-1155 credit system used for tracking USD-denominated credits.
/// @dev
/// - Deployed by the `Factory` via `cloneDeterministic`.
/// - Initialization wires roles, base URI, and collection metadata via `ERC1155Base`.
contract CreditToken is ERC1155Base {
    /// @notice Initializes the ERC-1155 credit collection.
    /// @dev Must be called exactly once on the freshly cloned proxy.
    /// @param info Initialization struct (admin/manager/minter/burner/uri/name/symbol).
    function initialize(ERC1155Info calldata info) external initializer {
        _initialize_ERC1155Base(info);
    }
}
