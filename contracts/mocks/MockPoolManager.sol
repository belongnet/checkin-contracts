// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

/// @notice Minimal stub pool manager for wiring tests; returns static slot0/liquidity and reverts state-changing calls.
contract MockPoolManager {
    struct Slot0 {
        uint160 sqrtPriceX96;
        int24 tick;
        uint24 protocolFee;
        uint24 lpFee;
    }

    /// @notice Fixed slot0 used for reads.
    Slot0 public slot0 = Slot0({
        sqrtPriceX96: 79228162514264337593543950336, // 2^96 (price = 1.0)
        tick: 0,
        protocolFee: 0,
        lpFee: 0
    });

    /// @notice Fixed liquidity value.
    uint128 public liquidity = 0;

    /// @notice Set slot0 for tests.
    function setSlot0(uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee) external {
        slot0 = Slot0({sqrtPriceX96: sqrtPriceX96, tick: tick, protocolFee: protocolFee, lpFee: lpFee});
    }

    /// @notice Set liquidity for tests.
    function setLiquidity(uint128 newLiquidity) external {
        liquidity = newLiquidity;
    }

    /// @notice Mimics ICLPoolManager.getSlot0.
    function getSlot0(bytes32) external view returns (uint160, int24, uint24, uint24) {
        return (slot0.sqrtPriceX96, slot0.tick, slot0.protocolFee, slot0.lpFee);
    }

    /// @notice Mimics ICLPoolManager.getLiquidity.
    function getLiquidity(bytes32) external view returns (uint128) {
        return liquidity;
    }

    /// @notice Revert on modifyLiquidity to make side effects explicit.
    function modifyLiquidity(bytes32, bytes calldata) external pure {
        revert("MockPoolManager: modifyLiquidity not implemented");
    }

    /// @notice Revert on swap to make side effects explicit.
    function swap(bytes32, bytes calldata) external pure {
        revert("MockPoolManager: swap not implemented");
    }
}
