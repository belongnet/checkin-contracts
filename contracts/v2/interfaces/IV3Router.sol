// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

/// @notice Minimal V3-like interfaces to unify UniswapV3 / PancakeV3 usage.
interface IV3Router {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}
