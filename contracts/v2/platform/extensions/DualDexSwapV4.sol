// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {DualDexSwapV4Lib} from "./DualDexSwapV4Lib.sol";

/// @notice Thin stateful wrapper over {DualDexSwapV4Lib} storing the active payments configuration.
abstract contract DualDexSwapV4 {
    DualDexSwapV4Lib.PaymentsInfo internal _paymentsInfo;

    /// @notice Returns the stored payments configuration.
    /// @return info The persisted {PaymentsInfo} struct.
    function paymentsInfo() external view returns (DualDexSwapV4Lib.PaymentsInfo memory info) {
        info = _paymentsInfo;
    }

    /// @notice Stores a payments configuration without altering the active dex selection.
    /// @param info New payments configuration to persist.
    function _storePaymentsInfo(DualDexSwapV4Lib.PaymentsInfo calldata info) internal {
        _paymentsInfo = info;
    }

    /// @notice Swaps USDC to LONG for a recipient using the configured v4 router.
    /// @param recipient Address receiving the LONG output.
    /// @param amount Exact USDC amount to swap.
    /// @return swapped The amount of LONG delivered to `recipient`.
    function _swapUSDCtoLONG(address recipient, uint256 amount) internal virtual returns (uint256 swapped) {
        if (recipient == address(0) || amount == 0) {
            return 0;
        }
        swapped = DualDexSwapV4Lib.swapUSDCtoLONG(_paymentsInfo, recipient, amount);
    }

    /// @notice Swaps LONG to USDC for a recipient using the configured v4 router.
    /// @param recipient Address receiving the USDC output.
    /// @param amount Exact LONG amount to swap.
    /// @return swapped The amount of USDC delivered to `recipient`.
    function _swapLONGtoUSDC(address recipient, uint256 amount) internal virtual returns (uint256 swapped) {
        if (recipient == address(0) || amount == 0) {
            return 0;
        }
        swapped = DualDexSwapV4Lib.swapLONGtoUSDC(_paymentsInfo, recipient, amount);
    }
}
