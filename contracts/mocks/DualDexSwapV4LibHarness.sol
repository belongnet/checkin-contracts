// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {DualDexSwapV4Lib} from "../v2/platform/extensions/DualDexSwapV4Lib.sol";

/// @notice Thin harness exposing DualDexSwapV4Lib entrypoints for testing.
contract DualDexSwapV4LibHarness {
    using SafeTransferLib for address;

    function swapExact(DualDexSwapV4Lib.PaymentsInfo memory info, DualDexSwapV4Lib.ExactInputSingleParams memory params)
        external
        returns (uint256 received)
    {
        received = DualDexSwapV4Lib.swapExact(info, params);
    }

    function swapExactPath(
        DualDexSwapV4Lib.PaymentsInfo memory info,
        DualDexSwapV4Lib.ExactInputMultiParams memory params
    ) external returns (uint256 received) {
        received = DualDexSwapV4Lib.swapExactPath(info, params);
    }

    function swapUSDtokenToLONG(
        DualDexSwapV4Lib.PaymentsInfo memory info,
        address recipient,
        uint256 amount,
        uint256 amountOutMinimum,
        uint256 deadline
    ) external returns (uint256 swapped) {
        swapped = DualDexSwapV4Lib.swapUSDtokenToLONG(info, recipient, amount, amountOutMinimum, deadline);
    }

    function swapLONGtoUSDtoken(
        DualDexSwapV4Lib.PaymentsInfo memory info,
        address recipient,
        uint256 amount,
        uint256 amountOutMinimum,
        uint256 deadline
    ) external returns (uint256 swapped) {
        swapped = DualDexSwapV4Lib.swapLONGtoUSDtoken(info, recipient, amount, amountOutMinimum, deadline);
    }

    function approveToken(address token, address spender, uint256 amount) external {
        token.safeApproveWithRetry(spender, amount);
    }
}
