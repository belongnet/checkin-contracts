// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

/// @notice Minimal V3-like interfaces to unify UniswapV3 / PancakeV3 usage.
interface IV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address);
}
