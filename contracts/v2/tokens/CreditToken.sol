// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {ERC1155Base} from "./base/ERC1155Base.sol";

contract CreditToken is ERC1155Base {
    function initialize(
        ERC1155Base.ERC1155Info calldata info
    ) external initializer {
        _initialize_ERC1155Base(info);
    }
}
