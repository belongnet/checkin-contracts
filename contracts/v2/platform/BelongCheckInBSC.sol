// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {IPancakeV3Factory as ISwapFactory} from "@pancakeswap/v3-core/contracts/interfaces/IPancakeV3Factory.sol";
import {ISwapRouter} from "@pancakeswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IQuoter} from "@pancakeswap/v3-periphery/contracts/interfaces/IQuoter.sol";

import {BelongCheckInBase, SafeTransferLib, Helper} from "./BelongCheckInBase.sol";

/// @title BelongCheckInBSC
/// @notice Orchestrates venue deposits, customer payments, and promoter payouts for a
///         referral-based commerce program with dual-token accounting (USDC/LONG).
/// @dev
/// - Uses ERC1155 credits (`CreditToken`) to track venue balances and promoter entitlements in USD units.
/// - Delegates custody and distribution of USDC/LONG to `Escrow`.
/// - Prices LONG via a Chainlink feed (`ILONGPriceFeed`) and swaps USDC→LONG on Uniswap V3.
/// - Applies tiered fees/discounts depending on staked balance in `Staking`.
/// - Signature-gated actions are authorized through a platform signer configured in `Factory`.
contract BelongCheckInBSC is BelongCheckInBase {
    using SafeTransferLib for address;
    using Helper for uint256;

    /// @notice Swaps exact USDC amount to LONG and sends proceeds to `recipient`.
    /// @dev
    /// - Builds a multi-hop path USDC → WETH → LONG using the same fee tier.
    /// - Uses Quoter to set a conservative `amountOutMinimum`.
    /// - Approves router for the exact USDC amount before calling.
    /// @param recipient The recipient of LONG. If zero or `amount` is zero, returns 0 without swapping.
    /// @param amount The USDC input amount to swap (USDC native decimals).
    /// @return swapped The amount of LONG received.
    function _swapUSDCtoLONG(
        address recipient,
        uint256 amount
    ) internal override returns (uint256 swapped) {
        if (recipient == address(0) || amount == 0) {
            return 0;
        }

        PaymentsInfo memory _paymentsInfo = belongCheckInStorage.paymentsInfo;

        bytes memory path;
        if (
            ISwapFactory(_paymentsInfo.swapV3Factory).getPool(
                _paymentsInfo.usdc,
                _paymentsInfo.long,
                _paymentsInfo.swapPoolFees
            ) != address(0)
        ) {
            path = abi.encodePacked(
                _paymentsInfo.usdc,
                _paymentsInfo.swapPoolFees,
                _paymentsInfo.long
            );
        } else if (
            ISwapFactory(_paymentsInfo.swapV3Factory).getPool(
                _paymentsInfo.usdc,
                _paymentsInfo.weth,
                _paymentsInfo.swapPoolFees
            ) != address(0)
        ) {
            path = abi.encodePacked(
                _paymentsInfo.usdc,
                _paymentsInfo.swapPoolFees,
                _paymentsInfo.weth,
                _paymentsInfo.swapPoolFees,
                _paymentsInfo.long
            );
        } else {
            revert NoValidSwapPath();
        }

        uint256 amountOutMinimum = IQuoter(_paymentsInfo.swapV3Quoter)
            .quoteExactInput(path, amount)
            .amountOutMin(_paymentsInfo.slippageBps);
        ISwapRouter.ExactInputParams memory swapParams = ISwapRouter
            .ExactInputParams({
                path: path,
                recipient: recipient,
                deadline: block.timestamp,
                amountIn: amount,
                amountOutMinimum: amountOutMinimum
            });

        _paymentsInfo.usdc.safeApprove(_paymentsInfo.swapV3Router, amount);
        swapped = ISwapRouter(_paymentsInfo.swapV3Router).exactInput(
            swapParams
        );

        emit Swapped(recipient, amount, swapped);
    }

    /// @notice Swaps exact LONG amount to USDC and sends proceeds to `recipient`.
    /// @dev
    /// - Builds a multi-hop path LONG → WETH → USDC using the same fee tier.
    /// - Uses Quoter to set a conservative `amountOutMinimum`.
    /// - Approves router for the exact LONG amount before calling.
    /// @param recipient The recipient of USDC. If zero or `amount` is zero, returns 0 without swapping.
    /// @param amount The LONG input amount to swap (LONG native decimals).
    /// @return swapped The amount of USDC received.
    function _swapLONGtoUSDC(
        address recipient,
        uint256 amount
    ) internal override returns (uint256 swapped) {
        if (recipient == address(0) || amount == 0) {
            return 0;
        }

        PaymentsInfo memory _paymentsInfo = belongCheckInStorage.paymentsInfo;

        bytes memory path;
        if (
            ISwapFactory(_paymentsInfo.swapV3Factory).getPool(
                _paymentsInfo.long,
                _paymentsInfo.usdc,
                _paymentsInfo.swapPoolFees
            ) != address(0)
        ) {
            path = abi.encodePacked(
                _paymentsInfo.long,
                _paymentsInfo.swapPoolFees,
                _paymentsInfo.usdc
            );
        } else if (
            ISwapFactory(_paymentsInfo.swapV3Factory).getPool(
                _paymentsInfo.long,
                _paymentsInfo.weth,
                _paymentsInfo.swapPoolFees
            ) != address(0)
        ) {
            path = abi.encodePacked(
                _paymentsInfo.long,
                _paymentsInfo.swapPoolFees,
                _paymentsInfo.weth,
                _paymentsInfo.swapPoolFees,
                _paymentsInfo.usdc
            );
        } else {
            revert NoValidSwapPath();
        }

        uint256 amountOutMinimum = IQuoter(_paymentsInfo.swapV3Quoter)
            .quoteExactInput(path, amount)
            .amountOutMin(_paymentsInfo.slippageBps);
        ISwapRouter.ExactInputParams memory swapParams = ISwapRouter
            .ExactInputParams({
                path: path,
                recipient: recipient,
                deadline: block.timestamp,
                amountIn: amount,
                amountOutMinimum: amountOutMinimum
            });

        _paymentsInfo.long.safeApprove(_paymentsInfo.swapV3Router, amount);
        swapped = ISwapRouter(_paymentsInfo.swapV3Router).exactInput(
            swapParams
        );

        emit Swapped(recipient, amount, swapped);
    }
}
