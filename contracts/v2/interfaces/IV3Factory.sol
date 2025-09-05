// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

/// @title IV3Factory
/// @notice Minimal V3-like factory interface to unify Uniswap V3 / Pancake V3 usage.
interface IV3Factory {
    /// @notice Returns the canonical pool address for a token pair and fee tier, or zero if none exists.
    /// @param tokenA Address of token A.
    /// @param tokenB Address of token B.
    /// @param fee The pool fee tier expressed in hundredths of a bip, e.g. 500, 3000, 10000.
    /// @return pool The pool address for the given pair and fee, or address(0) if not deployed.
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}
