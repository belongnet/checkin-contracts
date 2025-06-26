// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {ERC1155Base} from "./base/ERC1155Base.sol";

contract ReferralToken is ERC1155Base {
    function initialize(
        address defaultAdmin,
        address manager,
        address minter,
        address burner,
        string calldata uri_,
        bool _transferable
    ) external initializer {
        _initialize_ERC1155Base(
            defaultAdmin,
            manager,
            minter,
            burner,
            uri_,
            _transferable
        );
    }
}
