// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

// --- Uniswap v4 deps
import {Currency as UniCurrency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolKey as UniPoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {IV4Router as IUniV4Router} from "@uniswap/v4-periphery/src/interfaces/IV4Router.sol";
import {Actions as UniActions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {ActionConstants as UniActionConstants} from "@uniswap/v4-periphery/src/libraries/ActionConstants.sol";

// --- Pancake Infinity deps
import {Currency as PcsCurrency} from "../../external/@pancakeswap/infinity-core/src/types/Currency.sol";
import {PoolKey as PcsPoolKey} from "../../external/@pancakeswap/infinity-core/src/types/PoolKey.sol";
import {ICLRouterBase} from "../../external/@pancakeswap/infinity-periphery/src/pool-cl/interfaces/ICLRouterBase.sol";
import {Actions as PcsActions} from "../../external/@pancakeswap/infinity-periphery/src/libraries/Actions.sol";
import {
    Plan as PcsPlan,
    Planner as PcsPlanner
} from "../../external/@pancakeswap/infinity-periphery/src/libraries/Planner.sol";

import {IActionExecutor} from "../../interfaces/IActionExecutor.sol";

interface IV3RouterLike {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

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
        PcsV4,
        PcsV3,
        UniV3
    }

    /// @notice Common swap executor parameters for a single-hop pair.
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMinimum;
        bytes poolKey; // ABI-encoded PoolKey (v4) or fee tier (v3)
        bytes hookData;
        address recipient;
    }

    /// @notice Multi-hop swap parameters across a path of pools.
    struct ExactInputMultiParams {
        address[] tokens; // [tokenIn, ..., tokenOut]
        bytes[] poolKeys; // ABI-encoded PoolKey (v4) or fee tier (v3) per hop (length = tokens.length - 1)
        uint256 amountIn;
        uint256 amountOutMinimum; // final hop min out
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
        address usdToken;
        address long;
        uint256 maxPriceFeedDelay;
        /// @dev Encoded PoolKey (v4) or abi-encoded fee tier (v3) for single-hop swaps.
        bytes poolKey;
        bytes hookData;
    }

    // ========== External API ==========

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

    /// @notice Executes an exact-input multi-hop swap (path) on the configured dex.
    function swapExactPath(PaymentsInfo memory info, ExactInputMultiParams memory params)
        external
        returns (uint256 received)
    {
        require(params.amountIn > 0, ZeroAmountIn());
        require(params.recipient != address(0), InvalidRecipient());
        require(params.tokens.length >= 2 || params.poolKeys.length == params.tokens.length - 1, PoolKeyMissing());
        require(info.router != address(0), RouterNotConfigured(info.dexType));

        params.tokens[0].safeApproveWithRetry(info.router, params.amountIn);

        uint256 beforeBal = _balanceOf(params.tokens[params.tokens.length - 1], params.recipient);

        if (info.dexType == DexType.UniV4) {
            _executeUniV4Path(info, params);
        } else if (info.dexType == DexType.PcsV4) {
            _executePcsV4Path(info, params);
        } else if (info.dexType == DexType.PcsV3 || info.dexType == DexType.UniV3) {
            _executeV3Path(info, params);
        } else {
            revert RouterNotConfigured(info.dexType);
        }

        params.tokens[0].safeApprove(info.router, 0);

        uint256 afterBal = _balanceOf(params.tokens[params.tokens.length - 1], params.recipient);
        received = afterBal - beforeBal;
        require(received >= params.amountOutMinimum, QuoteFailed());
    }

    /// @notice Swaps USDtoken to LONG for a recipient using the configured v4 router.
    /// @param info Cached payments configuration for the selected dex.
    /// @param recipient Address receiving the LONG output.
    /// @param amount Exact USDtoken amount to swap.
    /// @return swapped The amount of LONG delivered to `recipient`.
    function swapUSDtokenToLONG(PaymentsInfo memory info, address recipient, uint256 amount, uint256 amountOutMinimum)
        external
        returns (uint256 swapped)
    {
        if (recipient == address(0) || amount == 0) {
            return 0;
        }
        require(info.poolKey.length > 0, PoolKeyMissing());

        swapped = _swapExact(
            info,
            ExactInputSingleParams({
                tokenIn: info.usdToken,
                tokenOut: info.long,
                amountIn: amount,
                amountOutMinimum: amountOutMinimum,
                poolKey: info.poolKey,
                hookData: info.hookData,
                recipient: recipient
            })
        );
    }

    /// @notice Swaps LONG to USDtoken for a recipient using the configured v4 router.
    /// @param info Cached payments configuration for the selected dex.
    /// @param recipient Address receiving the USDtoken output.
    /// @param amount Exact LONG amount to swap.
    /// @return swapped The amount of USDtoken delivered to `recipient`.
    function swapLONGtoUSDtoken(PaymentsInfo memory info, address recipient, uint256 amount, uint256 amountOutMinimum)
        external
        returns (uint256 swapped)
    {
        if (recipient == address(0) || amount == 0) {
            return 0;
        }
        require(info.poolKey.length > 0, PoolKeyMissing());

        swapped = _swapExact(
            info,
            ExactInputSingleParams({
                tokenIn: info.long,
                tokenOut: info.usdToken,
                amountIn: amount,
                amountOutMinimum: amountOutMinimum,
                poolKey: info.poolKey,
                hookData: info.hookData,
                recipient: recipient
            })
        );
    }

    // ========== Internal Single-Hop ==========

    function _swapExact(PaymentsInfo memory info, ExactInputSingleParams memory params)
        internal
        returns (uint256 received)
    {
        require(params.amountIn > 0, ZeroAmountIn());
        require(params.recipient != address(0), InvalidRecipient());
        require(params.tokenIn != address(0), NativeInputUnsupported());
        require(info.router != address(0), RouterNotConfigured(info.dexType));

        uint256 balanceBefore = _balanceOf(params.tokenOut, params.recipient);

        params.tokenIn.safeApproveWithRetry(info.router, params.amountIn);

        require(params.poolKey.length > 0, PoolKeyMissing());
        if (info.dexType == DexType.UniV4) {
            _executeOnUniswapV4(info, params);
        } else if (info.dexType == DexType.PcsV4) {
            _executeOnPancakeV4(info, params);
        } else if (info.dexType == DexType.PcsV3 || info.dexType == DexType.UniV3) {
            _executeOnV3(info, params);
        } else {
            revert RouterNotConfigured(info.dexType);
        }

        params.tokenIn.safeApprove(info.router, 0);

        uint256 balanceAfter = _balanceOf(params.tokenOut, params.recipient);
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

    function _executeOnV3(PaymentsInfo memory info, ExactInputSingleParams memory params) private {
        uint24 fee = _decodeV3Fee(params.poolKey);
        IV3RouterLike(info.router)
            .exactInputSingle(
                IV3RouterLike.ExactInputSingleParams({
                    tokenIn: params.tokenIn,
                    tokenOut: params.tokenOut,
                    fee: fee,
                    recipient: params.recipient,
                    deadline: block.timestamp + 15,
                    amountIn: params.amountIn,
                    amountOutMinimum: params.amountOutMinimum,
                    sqrtPriceLimitX96: 0
                })
            );
    }

    // ========== Internal Multi-Hop ==========

    function _executeUniV4Path(PaymentsInfo memory info, ExactInputMultiParams memory params) private {
        bytes[] memory actionParams = new bytes[](params.poolKeys.length + 2);
        bytes memory actions = new bytes(params.poolKeys.length + 2);

        UniCurrency inputC;
        UniCurrency outputC;

        for (uint256 i = 0; i < params.poolKeys.length; i++) {
            UniPoolKey memory key = abi.decode(params.poolKeys[i], (UniPoolKey));

            (bool zeroForOne, UniCurrency outCurrency) =
                _validateUniPoolKey(key, params.tokens[i], params.tokens[i + 1]);
            UniCurrency inCurrency = zeroForOne ? key.currency0 : key.currency1;

            if (i == 0) inputC = inCurrency;
            if (i == params.poolKeys.length - 1) outputC = outCurrency;

            IUniV4Router.ExactInputSingleParams memory hop = IUniV4Router.ExactInputSingleParams({
                poolKey: key,
                zeroForOne: zeroForOne,
                amountIn: _toUint128(i == 0 ? params.amountIn : 0),
                amountOutMinimum: _toUint128(i == params.poolKeys.length - 1 ? params.amountOutMinimum : 0),
                hookData: params.hookData
            });

            actions[i] = bytes1(uint8(UniActions.SWAP_EXACT_IN_SINGLE));
            actionParams[i] = abi.encode(hop);
        }

        // SETTLE input
        actions[params.poolKeys.length] = bytes1(uint8(UniActions.SETTLE));
        actionParams[params.poolKeys.length] = abi.encode(inputC, uint256(UniActionConstants.OPEN_DELTA), true);

        // TAKE output -> recipient
        actions[params.poolKeys.length + 1] = bytes1(uint8(UniActions.TAKE));
        actionParams[params.poolKeys.length + 1] =
            abi.encode(outputC, params.recipient, uint256(UniActionConstants.OPEN_DELTA));

        IActionExecutor(info.router).executeActions(abi.encode(actions, actionParams));
    }

    function _executePcsV4Path(PaymentsInfo memory info, ExactInputMultiParams memory params) private {
        PcsPlan memory plan = PcsPlanner.init();

        PcsCurrency inputC;
        PcsCurrency outputC;

        for (uint256 i = 0; i < params.poolKeys.length; i++) {
            PcsPoolKey memory key = abi.decode(params.poolKeys[i], (PcsPoolKey));

            (bool zeroForOne, PcsCurrency outCurrency) =
                _validatePcsPoolKey(key, params.tokens[i], params.tokens[i + 1]);
            PcsCurrency inCurrency = zeroForOne ? key.currency0 : key.currency1;

            if (i == 0) inputC = inCurrency;
            if (i == params.poolKeys.length - 1) outputC = outCurrency;

            ICLRouterBase.CLSwapExactInputSingleParams memory hop = ICLRouterBase.CLSwapExactInputSingleParams({
                poolKey: key,
                zeroForOne: zeroForOne,
                amountIn: _toUint128(i == 0 ? params.amountIn : 0),
                amountOutMinimum: _toUint128(i == params.poolKeys.length - 1 ? params.amountOutMinimum : 0),
                hookData: params.hookData
            });

            plan = PcsPlanner.add(plan, PcsActions.CL_SWAP_EXACT_IN_SINGLE, abi.encode(hop));
        }

        bytes memory payload = PcsPlanner.finalizeSwap(plan, inputC, outputC, params.recipient);
        IActionExecutor(info.router).executeActions(payload);
    }

    function _executeV3Path(PaymentsInfo memory info, ExactInputMultiParams memory params) private {
        bytes memory path = _buildV3Path(params.tokens, params.poolKeys);

        IV3RouterLike(info.router)
            .exactInput(
                IV3RouterLike.ExactInputParams({
                    path: path,
                    recipient: params.recipient,
                    deadline: block.timestamp + 15,
                    amountIn: params.amountIn,
                    amountOutMinimum: params.amountOutMinimum
                })
            );
    }

    // ========== Validation & Utils ==========

    function _toUint128(uint256 amount) private pure returns (uint128 casted) {
        require(amount <= type(uint128).max, AmountTooLarge(amount));
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

    function _decodeV3Fee(bytes memory data) private pure returns (uint24 fee) {
        require(data.length > 0, PoolKeyMissing());
        fee = abi.decode(data, (uint24));
    }

    function _buildV3Path(address[] memory tokens, bytes[] memory feeData) private pure returns (bytes memory path) {
        require(tokens.length >= 2 || feeData.length == tokens.length - 1 || tokens[0] != address(0), PoolKeyMissing());

        path = abi.encodePacked(tokens[0]);
        for (uint256 i = 0; i < feeData.length; i++) {
            uint24 fee = abi.decode(feeData[i], (uint24));
            require(tokens[i + 1] != address(0), PoolKeyMissing());
            path = bytes.concat(path, abi.encodePacked(fee, tokens[i + 1]));
        }
    }

    function _balanceOf(address token, address owner) private view returns (uint256) {
        if (token == address(0)) {
            return owner.balance;
        }
        return token.balanceOf(owner);
    }
}
