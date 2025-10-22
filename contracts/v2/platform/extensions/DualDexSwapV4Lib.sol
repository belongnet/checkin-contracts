// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

// --- Uniswap v4 deps
import {Currency as UniCurrency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolKey as UniPoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {IV4Router as IUniV4Router} from "@uniswap/v4-periphery/src/interfaces/IV4Router.sol";
import {IV4Quoter} from "@uniswap/v4-periphery/src/interfaces/IV4Quoter.sol";
import {Actions as UniActions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {ActionConstants as UniActionConstants} from "@uniswap/v4-periphery/src/libraries/ActionConstants.sol";

// --- Pancake Infinity deps
import {Currency as PcsCurrency} from "../../external/@pancakeswap/infinity-core/src/types/Currency.sol";
import {PoolKey as PcsPoolKey} from "../../external/@pancakeswap/infinity-core/src/types/PoolKey.sol";
import {ICLRouterBase} from "../../external/@pancakeswap/infinity-periphery/src/pool-cl/interfaces/ICLRouterBase.sol";
import {ICLQuoter} from "../../external/@pancakeswap/infinity-periphery/src/pool-cl/interfaces/ICLQuoter.sol";
import {IQuoter} from "../../external/@pancakeswap/infinity-periphery/src/interfaces/IQuoter.sol";
import {Actions as PcsActions} from "../../external/@pancakeswap/infinity-periphery/src/libraries/Actions.sol";
import {
    Plan as PcsPlan,
    Planner as PcsPlanner
} from "../../external/@pancakeswap/infinity-periphery/src/libraries/Planner.sol";

import {Helper} from "../../utils/Helper.sol";

import {IActionExecutor} from "../../interfaces/IActionExecutor.sol";

/// @notice Stateless helper for routing swaps across Uniswap v4 and Pancake Infinity.
library DualDexSwapV4Lib {
    using SafeTransferLib for address;

    // ========== Shared Errors ==========

    error PoolTokenMismatch(address tokenIn, address tokenOut);
    error RouterNotConfigured(DexType dexType);
    error PoolKeyMissing();
    error AmountTooLarge(uint256 amount);
    error InvalidRecipient();
    error QuoteFailed();
    error ZeroAmountIn();
    error NativeInputUnsupported();

    /// @notice Supported DEX integrations for the dual swap helper.
    enum DexType {
        UniV4,
        PcsV4
    }

    /// @notice Common swap executor parameters for a single-hop pair.
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMinimum;
        bytes poolKey; // ABI-encoded PoolKey (Uniswap or Pancake Infinity)
        bytes hookData;
        address recipient;
    }

    /// @notice DEX routing and token addresses.
    /// @notice Slippage tolerance scaled to 27 decimals where 1e27 == 100%.
    /// @dev Used by `Helper.amountOutMin`; valid range [0, 1e27].
    struct PaymentsInfo {
        DexType dexType;
        uint96 slippageBps;
        address router;
        address quoter;
        address usdc;
        address long;
        uint256 maxPriceFeedDelay;
        bytes poolKey;
        bytes hookData;
    }

    /// @notice Executes an exact-input single-hop swap on the configured dex.
    /// @param info Cached payments configuration for the selected dex.
    /// @param params Swap parameters shared between Uniswap v4 and Pancake Infinity.
    /// @return received The amount of `tokenOut` delivered to `params.recipient`.
    function swapExact(PaymentsInfo memory info, ExactInputSingleParams memory params)
        external
        returns (uint256 received)
    {
        return _swapExact(info, params);
    }

    /// @notice Swaps USDC to LONG for a recipient using the configured v4 router.
    /// @param info Cached payments configuration for the selected dex.
    /// @param recipient Address receiving the LONG output.
    /// @param amount Exact USDC amount to swap.
    /// @return swapped The amount of LONG delivered to `recipient`.
    function swapUSDCtoLONG(PaymentsInfo memory info, address recipient, uint256 amount)
        external
        returns (uint256 swapped)
    {
        if (recipient == address(0) || amount == 0) {
            return 0;
        }
        if (info.poolKey.length == 0) {
            revert PoolKeyMissing();
        }

        uint256 amountOutMinimum = _quoteMinOut(info, info.usdc, info.long, amount);
        swapped = _swapExact(
            info,
            ExactInputSingleParams({
                tokenIn: info.usdc,
                tokenOut: info.long,
                amountIn: amount,
                amountOutMinimum: amountOutMinimum,
                poolKey: info.poolKey,
                hookData: info.hookData,
                recipient: recipient
            })
        );
    }

    /// @notice Swaps LONG to USDC for a recipient using the configured v4 router.
    /// @param info Cached payments configuration for the selected dex.
    /// @param recipient Address receiving the USDC output.
    /// @param amount Exact LONG amount to swap.
    /// @return swapped The amount of USDC delivered to `recipient`.
    function swapLONGtoUSDC(PaymentsInfo memory info, address recipient, uint256 amount)
        external
        returns (uint256 swapped)
    {
        if (recipient == address(0) || amount == 0) {
            return 0;
        }
        if (info.poolKey.length == 0) {
            revert PoolKeyMissing();
        }

        uint256 amountOutMinimum = _quoteMinOut(info, info.long, info.usdc, amount);
        swapped = _swapExact(
            info,
            ExactInputSingleParams({
                tokenIn: info.long,
                tokenOut: info.usdc,
                amountIn: amount,
                amountOutMinimum: amountOutMinimum,
                poolKey: info.poolKey,
                hookData: info.hookData,
                recipient: recipient
            })
        );
    }

    // ========== Internal Helpers ==========

    function _swapExact(PaymentsInfo memory info, ExactInputSingleParams memory params)
        internal
        returns (uint256 received)
    {
        if (params.amountIn == 0) revert ZeroAmountIn();
        if (params.recipient == address(0)) revert InvalidRecipient();
        if (params.tokenIn == address(0)) revert NativeInputUnsupported();
        if (params.poolKey.length == 0) revert PoolKeyMissing();
        if (info.router == address(0)) revert RouterNotConfigured(info.dexType);

        uint256 balanceBefore =
            params.tokenOut == address(0) ? params.recipient.balance : params.tokenOut.balanceOf(params.recipient);

        params.tokenIn.safeApproveWithRetry(info.router, params.amountIn);

        if (info.dexType == DexType.UniV4) {
            _executeOnUniswapV4(info, params);
        } else {
            _executeOnPancakeV4(info, params);
        }

        params.tokenIn.safeApprove(info.router, 0);

        uint256 balanceAfter =
            params.tokenOut == address(0) ? params.recipient.balance : params.tokenOut.balanceOf(params.recipient);
        received = balanceAfter - balanceBefore;
    }

    function _executeOnUniswapV4(PaymentsInfo memory info, ExactInputSingleParams memory params) private {
        UniPoolKey memory poolKey = abi.decode(params.poolKey, (UniPoolKey));
        (bool zeroForOne, UniCurrency outputCurrency) = _validateUniPoolKey(poolKey, params.tokenIn, params.tokenOut);
        UniCurrency inputCurrency = zeroForOne ? poolKey.currency0 : poolKey.currency1;

        IUniV4Router.ExactInputSingleParams memory swapParams = IUniV4Router.ExactInputSingleParams({
            poolKey: poolKey,
            zeroForOne: zeroForOne,
            amountIn: _toUint128(params.amountIn),
            amountOutMinimum: _toUint128(params.amountOutMinimum),
            hookData: params.hookData
        });

        bytes[] memory actionParams = new bytes[](3);
        actionParams[0] = abi.encode(swapParams);
        actionParams[1] = abi.encode(inputCurrency, uint256(UniActionConstants.OPEN_DELTA), true);
        actionParams[2] = abi.encode(outputCurrency, params.recipient, uint256(UniActionConstants.OPEN_DELTA));

        bytes memory actions = new bytes(3);
        actions[0] = bytes1(uint8(UniActions.SWAP_EXACT_IN_SINGLE));
        actions[1] = bytes1(uint8(UniActions.SETTLE));
        actions[2] = bytes1(uint8(UniActions.TAKE));

        IActionExecutor(info.router).executeActions(abi.encode(actions, actionParams));
    }

    function _executeOnPancakeV4(PaymentsInfo memory info, ExactInputSingleParams memory params) private {
        PcsPoolKey memory poolKey = abi.decode(params.poolKey, (PcsPoolKey));
        (bool zeroForOne, PcsCurrency outputCurrency) = _validatePcsPoolKey(poolKey, params.tokenIn, params.tokenOut);
        PcsCurrency inputCurrency = zeroForOne ? poolKey.currency0 : poolKey.currency1;

        ICLRouterBase.CLSwapExactInputSingleParams memory swapParams = ICLRouterBase.CLSwapExactInputSingleParams({
            poolKey: poolKey,
            zeroForOne: zeroForOne,
            amountIn: _toUint128(params.amountIn),
            amountOutMinimum: _toUint128(params.amountOutMinimum),
            hookData: params.hookData
        });

        PcsPlan memory plan = PcsPlanner.init();
        plan = PcsPlanner.add(plan, PcsActions.CL_SWAP_EXACT_IN_SINGLE, abi.encode(swapParams));
        bytes memory payload = PcsPlanner.finalizeSwap(plan, inputCurrency, outputCurrency, params.recipient);

        IActionExecutor(info.router).executeActions(payload);
    }

    function _quoteMinOut(PaymentsInfo memory info, address tokenIn, address tokenOut, uint256 amountIn)
        private
        returns (uint256 minOut)
    {
        if (amountIn == 0 || info.quoter == address(0) || info.poolKey.length == 0) {
            return 0;
        }

        if (info.dexType == DexType.UniV4) {
            UniPoolKey memory poolKey = abi.decode(info.poolKey, (UniPoolKey));
            (bool zeroForOne,) = _validateUniPoolKey(poolKey, tokenIn, tokenOut);

            try IV4Quoter(info.quoter)
                .quoteExactInputSingle(
                    IV4Quoter.QuoteExactSingleParams({
                        poolKey: poolKey,
                        zeroForOne: zeroForOne,
                        exactAmount: _toUint128(amountIn),
                        hookData: info.hookData
                    })
                ) returns (uint256 amountOut, uint256) {
                minOut = Helper.amountOutMin(amountOut, info.slippageBps);
            } catch {
                revert QuoteFailed();
            }
        } else {
            PcsPoolKey memory poolKey = abi.decode(info.poolKey, (PcsPoolKey));
            (bool zeroForOne,) = _validatePcsPoolKey(poolKey, tokenIn, tokenOut);

            try ICLQuoter(info.quoter)
                .quoteExactInputSingle(
                    IQuoter.QuoteExactSingleParams({
                        poolKey: poolKey,
                        zeroForOne: zeroForOne,
                        exactAmount: _toUint128(amountIn),
                        hookData: info.hookData
                    })
                ) returns (uint256 amountOut, uint256) {
                minOut = Helper.amountOutMin(amountOut, info.slippageBps);
            } catch {
                revert QuoteFailed();
            }
        }
    }

    function _toUint128(uint256 amount) private pure returns (uint128 casted) {
        if (amount > type(uint128).max) revert AmountTooLarge(amount);
        casted = uint128(amount);
    }

    function _validateUniPoolKey(UniPoolKey memory poolKey, address tokenIn, address tokenOut)
        private
        pure
        returns (bool zeroForOne, UniCurrency outputCurrency)
    {
        address currency0 = UniCurrency.unwrap(poolKey.currency0);
        address currency1 = UniCurrency.unwrap(poolKey.currency1);

        if (tokenIn == currency0 && tokenOut == currency1) {
            zeroForOne = true;
            outputCurrency = poolKey.currency1;
        } else if (tokenIn == currency1 && tokenOut == currency0) {
            zeroForOne = false;
            outputCurrency = poolKey.currency0;
        } else {
            revert PoolTokenMismatch(tokenIn, tokenOut);
        }
    }

    function _validatePcsPoolKey(PcsPoolKey memory poolKey, address tokenIn, address tokenOut)
        private
        pure
        returns (bool zeroForOne, PcsCurrency outputCurrency)
    {
        address currency0 = PcsCurrency.unwrap(poolKey.currency0);
        address currency1 = PcsCurrency.unwrap(poolKey.currency1);

        if (tokenIn == currency0 && tokenOut == currency1) {
            zeroForOne = true;
            outputCurrency = poolKey.currency1;
        } else if (tokenIn == currency1 && tokenOut == currency0) {
            zeroForOne = false;
            outputCurrency = poolKey.currency0;
        } else {
            revert PoolTokenMismatch(tokenIn, tokenOut);
        }
    }
}
