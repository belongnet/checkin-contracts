// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

/// @title IV3Quoter
/// @notice Minimal V3-like quoter interface to unify Uniswap V3 / Pancake V3 quoting.
interface IV3Quoter {
    /// @notice Returns a quote for an exact-input swap along the provided path.
    /// @param path ABI-encoded path of token addresses and fee tiers.
    /// @param amountIn Exact amount of input tokens to quote.
    /// @return amountOut The quoted amount of output tokens.
    function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut);
}
