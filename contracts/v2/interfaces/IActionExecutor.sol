// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

/// @dev Minimal executeActions surface shared by both v4 routers.
interface IActionExecutor {
    function executeActions(bytes calldata params) external payable;
}
