// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

/// @notice Minimal V3-like interfaces to unify UniswapV3 / PancakeV3 usage.
interface IV3Quoter {
    function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut);
}
