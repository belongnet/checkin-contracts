// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {IUniswapV3Factory as ISwapFactory} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IQuoter} from "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";

import {BelongCheckInBase, SafeTransferLib, Helper} from "./BelongCheckInBase.sol";

/// @title BelongCheckIn
/// @notice Orchestrates venue deposits, customer payments, and promoter payouts for a
///         referral-based commerce program with dual-token accounting (USDC/LONG).
/// @dev
/// - Uses ERC1155 credits (`CreditToken`) to track venue balances and promoter entitlements in USD units.
/// - Delegates custody and distribution of USDC/LONG to `Escrow`.
/// - Prices LONG via a Chainlink feed (`ILONGPriceFeed`) and swaps USDC→LONG on Uniswap V3.
/// - Applies tiered fees/discounts depending on staked balance in `Staking`.
/// - Signature-gated actions are authorized through a platform signer configured in `Factory`.
contract BelongCheckIn is BelongCheckInBase {
    using SafeTransferLib for address;
    using Helper for uint256;

    /* ========================================= */
    /* ========== OVERRIDDEN FUNCTIONS ========= */
    /* ========================================= */

    /// @dev Builds the best-available path between `tokenIn` and `tokenOut`.
    ///      Prefers direct pool, otherwise routes via WETH using the same fee tier.
    function _buildPath(PaymentsInfo memory paymentsInfo, address tokenIn, address tokenOut)
        internal
        view
        override
        returns (bytes memory path)
    {
        // Direct pool
        if (
            ISwapFactory(paymentsInfo.swapV3Factory).getPool(tokenIn, tokenOut, paymentsInfo.swapPoolFees) != address(0)
        ) {
            path = abi.encodePacked(tokenIn, paymentsInfo.swapPoolFees, tokenOut);
        }
        // tokenIn -> WETH -> tokenOut
        else if (
            ISwapFactory(paymentsInfo.swapV3Factory).getPool(tokenIn, paymentsInfo.weth, paymentsInfo.swapPoolFees)
                != address(0)
        ) {
            path = abi.encodePacked(
                tokenIn, paymentsInfo.swapPoolFees, paymentsInfo.weth, paymentsInfo.swapPoolFees, tokenOut
            );
        } else {
            revert NoValidSwapPath();
        }
    }

    /// @dev Common swap executor with minimal approvals and conservative slippage.
    function _swapExact(address tokenIn, address tokenOut, address recipient, uint256 amount)
        internal
        override
        returns (uint256 swapped)
    {
        if (recipient == address(0) || amount == 0) {
            return 0;
        }

        PaymentsInfo memory paymentsInfo = belongCheckInStorage.paymentsInfo;

        bytes memory path = _buildPath(paymentsInfo, tokenIn, tokenOut);

        uint256 amountOutMinimum =
            IQuoter(paymentsInfo.swapV3Quoter).quoteExactInput(path, amount).amountOutMin(paymentsInfo.slippageBps);

        ISwapRouter.ExactInputParams memory swapParams = ISwapRouter.ExactInputParams({
            path: path,
            recipient: recipient,
            deadline: block.timestamp,
            amountIn: amount,
            amountOutMinimum: amountOutMinimum
        });

        // Reset -> set pattern to support non-standard ERC20s that require zeroing allowance first
        tokenIn.safeApproveWithRetry(paymentsInfo.swapV3Router, amount);

        swapped = ISwapRouter(paymentsInfo.swapV3Router).exactInput(swapParams);

        // Clear allowance to reduce residual approvals surface area
        tokenIn.safeApprove(paymentsInfo.swapV3Router, 0);

        emit Swapped(recipient, amount, swapped);
    }
}
