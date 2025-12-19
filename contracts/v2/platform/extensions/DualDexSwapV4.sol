// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Helper} from "../../utils/Helper.sol";
import {DualDexSwapV4Lib} from "./DualDexSwapV4Lib.sol";

/// @notice Thin stateful wrapper over {DualDexSwapV4Lib} storing the active payments configuration.
abstract contract DualDexSwapV4 {
    /// @notice Reverts when a provided bps value exceeds the configured scaling domain.
    error BPSTooHigh();

    /// @notice Emitted when the payments configuration is updated.
    /// @param info The new payments configuration.
    event PaymentsInfoSet(DualDexSwapV4Lib.PaymentsInfo info);

    DualDexSwapV4Lib.PaymentsInfo internal _paymentsInfo;

    /// @notice Returns the stored payments configuration.
    /// @return info The persisted {PaymentsInfo} struct.
    function paymentsInfo() external view returns (DualDexSwapV4Lib.PaymentsInfo memory info) {
        info = _paymentsInfo;
    }

    /// @notice Stores a payments configuration without altering the active dex selection.
    /// @param info New payments configuration to persist.
    function _storePaymentsInfo(DualDexSwapV4Lib.PaymentsInfo calldata info) internal {
        require(info.slippageBps <= Helper.BPS, BPSTooHigh());
        _paymentsInfo = info;
        emit PaymentsInfoSet(info);
    }

    /// @notice Swaps USDC to LONG for a recipient using the configured v4 router.
    /// @param recipient Address receiving the LONG output.
    /// @param amount Exact USDC amount to swap.
    /// @param deadline Unix timestamp after which the swap should revert (0 to use library default).
    /// @return swapped The amount of LONG delivered to `recipient`.
    function _swapUSDtokenToLONG(address recipient, uint256 amount, uint256 deadline)
        internal
        virtual
        returns (uint256 swapped)
    {
        if (recipient == address(0) || amount == 0) {
            return 0;
        }
        swapped = DualDexSwapV4Lib.swapUSDtokenToLONG(
            _paymentsInfo, recipient, amount, _quoteUSDtokenToLONG(amount), deadline
        );
    }

    /// @notice Swaps LONG to USDC for a recipient using the configured v4 router.
    /// @param recipient Address receiving the USDC output.
    /// @param amount Exact LONG amount to swap.
    /// @param deadline Unix timestamp after which the swap should revert (0 to use library default).
    /// @return swapped The amount of USDC delivered to `recipient`.
    function _swapLONGtoUSDtoken(address recipient, uint256 amount, uint256 deadline)
        internal
        virtual
        returns (uint256 swapped)
    {
        if (recipient == address(0) || amount == 0) {
            return 0;
        }
        swapped = DualDexSwapV4Lib.swapLONGtoUSDtoken(
            _paymentsInfo, recipient, amount, _quoteLONGtoUSDtoken(amount), deadline
        );
    }

    /// @notice Executes a multi-hop swap along a precomputed path using the configured dex.
    function _swapExactPath(DualDexSwapV4Lib.ExactInputMultiParams memory params)
        internal
        virtual
        returns (uint256 received)
    {
        received = DualDexSwapV4Lib.swapExactPath(_paymentsInfo, params);
    }

    function _quoteUSDtokenToLONG(uint256) internal view virtual returns (uint256);

    function _quoteLONGtoUSDtoken(uint256) internal view virtual returns (uint256);
}
