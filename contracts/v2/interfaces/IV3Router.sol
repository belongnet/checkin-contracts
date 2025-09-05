// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

/// @title IV3Router
/// @notice Minimal V3-like router interface to unify Uniswap V3 / Pancake V3 exact-input swaps.
interface IV3Router {
    /// @notice Parameters for an exact-input multi-hop swap.
    /// @param path ABI-encoded path of token addresses and fee tiers.
    /// @param recipient Address receiving the output tokens.
    /// @param deadline Unix timestamp after which the swap will revert.
    /// @param amountIn Exact amount of input tokens to swap.
    /// @param amountOutMinimum Minimum amount of output tokens expected (slippage protection).
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    /// @notice Executes an exact-input swap along the provided path.
    /// @param params The exact-input swap parameters.
    /// @return amountOut The amount of output tokens received.
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}
