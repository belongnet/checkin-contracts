// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {SafeCastLib} from "solady/src/utils/SafeCastLib.sol";

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

interface IUniversalRouterLike {
    function execute(bytes calldata commands, bytes[] calldata inputs) external payable;

    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}

interface IAllowanceTransferLike {
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

/// @notice Stateless helper for routing swaps across Uniswap v4 and Pancake Infinity.
library DualDexSwapV4Lib {
    using SafeTransferLib for address;

    address private constant UNI_PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address private constant PCS_PERMIT2 = 0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768;
    bytes1 private constant UNIVERSAL_ROUTER_V4_SWAP = 0x10;

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
        uint256 deadline;
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
        uint256 deadline;
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
        require(params.tokens.length >= 2 && params.poolKeys.length == params.tokens.length - 1, PoolKeyMissing());
        require(info.router != address(0), RouterNotConfigured(info.dexType));

        uint256 beforeBal = params.tokens[params.tokens.length - 1].balanceOf(params.recipient);

        _approveForSwap(info, params.tokens[0], params.amountIn);

        if (info.dexType == DexType.UniV4) {
            _executeUniV4Path(info, params);
        } else if (info.dexType == DexType.PcsV4) {
            _executePcsV4Path(info, params);
        } else if (info.dexType == DexType.PcsV3 || info.dexType == DexType.UniV3) {
            _executeV3Path(info, params);
        } else {
            revert RouterNotConfigured(info.dexType);
        }

        _clearApprovalForSwap(info, params.tokens[0]);

        received = params.tokens[params.tokens.length - 1].balanceOf(params.recipient) - beforeBal;
        require(received >= params.amountOutMinimum, QuoteFailed());
    }

    /// @notice Swaps USDtoken to LONG for a recipient using the configured v4 router.
    /// @param info Cached payments configuration for the selected dex.
    /// @param recipient Address receiving the LONG output.
    /// @param amount Exact USDtoken amount to swap.
    /// @return swapped The amount of LONG delivered to `recipient`.
    function swapUSDtokenToLONG(
        PaymentsInfo memory info,
        address recipient,
        uint256 amount,
        uint256 amountOutMinimum,
        uint256 deadline
    ) external returns (uint256 swapped) {
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
                deadline: deadline,
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
    function swapLONGtoUSDtoken(
        PaymentsInfo memory info,
        address recipient,
        uint256 amount,
        uint256 amountOutMinimum,
        uint256 deadline
    ) external returns (uint256 swapped) {
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
                deadline: deadline,
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

        uint256 balanceBefore = params.tokenOut.balanceOf(params.recipient);

        _approveForSwap(info, params.tokenIn, params.amountIn);

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

        _clearApprovalForSwap(info, params.tokenIn);

        received = params.tokenOut.balanceOf(params.recipient) - balanceBefore;
        require(received >= params.amountOutMinimum, QuoteFailed());
    }

    function _executeOnUniswapV4(PaymentsInfo memory info, ExactInputSingleParams memory params) private {
        UniPoolKey memory poolKey = abi.decode(params.poolKey, (UniPoolKey));
        (bool zeroForOne, UniCurrency outputCurrency) = _validateUniPoolKey(poolKey, params.tokenIn, params.tokenOut);
        UniCurrency inputCurrency = zeroForOne ? poolKey.currency0 : poolKey.currency1;

        IUniV4Router.ExactInputSingleParams memory swapParams = IUniV4Router.ExactInputSingleParams({
            poolKey: poolKey,
            zeroForOne: zeroForOne,
            amountIn: SafeCastLib.toUint128(params.amountIn),
            amountOutMinimum: SafeCastLib.toUint128(params.amountOutMinimum),
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

        _executeV4UniversalRouter(info.router, abi.encode(actions, actionParams), params.deadline);
    }

    function _executeOnPancakeV4(PaymentsInfo memory info, ExactInputSingleParams memory params) private {
        PcsPoolKey memory poolKey = abi.decode(params.poolKey, (PcsPoolKey));
        (bool zeroForOne, PcsCurrency outputCurrency) = _validatePcsPoolKey(poolKey, params.tokenIn, params.tokenOut);
        PcsCurrency inputCurrency = zeroForOne ? poolKey.currency0 : poolKey.currency1;

        ICLRouterBase.CLSwapExactInputSingleParams memory swapParams = ICLRouterBase.CLSwapExactInputSingleParams({
            poolKey: poolKey,
            zeroForOne: zeroForOne,
            amountIn: SafeCastLib.toUint128(params.amountIn),
            amountOutMinimum: SafeCastLib.toUint128(params.amountOutMinimum),
            hookData: params.hookData
        });

        PcsPlan memory plan = PcsPlanner.init();
        plan = PcsPlanner.add(plan, PcsActions.CL_SWAP_EXACT_IN_SINGLE, abi.encode(swapParams));
        bytes memory payload = PcsPlanner.finalizeSwap(plan, inputCurrency, outputCurrency, params.recipient);

        _executeV4UniversalRouter(info.router, payload, params.deadline);
    }

    function _executeOnV3(PaymentsInfo memory info, ExactInputSingleParams memory params) private {
        uint24 fee = _decodeV3Fee(params.poolKey);
        uint256 deadline = params.deadline == 0 ? block.timestamp : params.deadline;
        IV3RouterLike(info.router)
            .exactInputSingle(
                IV3RouterLike.ExactInputSingleParams({
                    tokenIn: params.tokenIn,
                    tokenOut: params.tokenOut,
                    fee: fee,
                    recipient: params.recipient,
                    deadline: deadline,
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
                amountIn: SafeCastLib.toUint128(i == 0 ? params.amountIn : 0),
                amountOutMinimum: SafeCastLib.toUint128(i == params.poolKeys.length - 1 ? params.amountOutMinimum : 0),
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

        _executeV4UniversalRouter(info.router, abi.encode(actions, actionParams), params.deadline);
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

            if (i == 0) {
                inputC = inCurrency;
            }
            if (i == params.poolKeys.length - 1) {
                outputC = outCurrency;
            }

            ICLRouterBase.CLSwapExactInputSingleParams memory hop = ICLRouterBase.CLSwapExactInputSingleParams({
                poolKey: key,
                zeroForOne: zeroForOne,
                amountIn: SafeCastLib.toUint128(i == 0 ? params.amountIn : 0),
                amountOutMinimum: SafeCastLib.toUint128(i == params.poolKeys.length - 1 ? params.amountOutMinimum : 0),
                hookData: params.hookData
            });

            plan = PcsPlanner.add(plan, PcsActions.CL_SWAP_EXACT_IN_SINGLE, abi.encode(hop));
        }

        bytes memory payload = PcsPlanner.finalizeSwap(plan, inputC, outputC, params.recipient);
        _executeV4UniversalRouter(info.router, payload, params.deadline);
    }

    function _executeV3Path(PaymentsInfo memory info, ExactInputMultiParams memory params) private {
        bytes memory path = _buildV3Path(params.tokens, params.poolKeys);
        uint256 deadline = params.deadline == 0 ? block.timestamp + 15 : params.deadline;

        IV3RouterLike(info.router)
            .exactInput(
                IV3RouterLike.ExactInputParams({
                    path: path,
                    recipient: params.recipient,
                    deadline: deadline,
                    amountIn: params.amountIn,
                    amountOutMinimum: params.amountOutMinimum
                })
            );
    }

    // ========== Validation & Utils ==========

    function _approveForSwap(PaymentsInfo memory info, address token, uint256 amount) private {
        token.safeApproveWithRetry(info.router, amount);

        address permit2 = _permit2ForDex(info.dexType);
        if (permit2 != address(0) && permit2.code.length != 0) {
            token.safeApproveWithRetry(permit2, amount);
            IAllowanceTransferLike(permit2).approve(
                token, info.router, SafeCastLib.toUint160(amount), type(uint48).max
            );
        }
    }

    function _clearApprovalForSwap(PaymentsInfo memory info, address token) private {
        token.safeApprove(info.router, 0);

        address permit2 = _permit2ForDex(info.dexType);
        if (permit2 != address(0) && permit2.code.length != 0) {
            IAllowanceTransferLike(permit2).approve(token, info.router, 0, 0);
            token.safeApprove(permit2, 0);
        }
    }

    function _permit2ForDex(DexType dexType) private pure returns (address) {
        if (dexType == DexType.UniV4) {
            return UNI_PERMIT2;
        }
        if (dexType == DexType.PcsV4) {
            return PCS_PERMIT2;
        }
        return address(0);
    }

    function _executeV4UniversalRouter(address router, bytes memory payload, uint256 deadline) private {
        bytes memory commands = new bytes(1);
        commands[0] = UNIVERSAL_ROUTER_V4_SWAP;

        bytes[] memory inputs = new bytes[](1);
        inputs[0] = payload;

        if (deadline == 0) {
            IUniversalRouterLike(router).execute(commands, inputs);
        } else {
            IUniversalRouterLike(router).execute(commands, inputs, deadline);
        }
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
        require(
            tokens.length >= 2 && feeData.length == tokens.length - 1 && tokens[0] != address(0), PoolKeyMissing()
        );

        path = abi.encodePacked(tokens[0]);
        for (uint256 i = 0; i < feeData.length; i++) {
            uint24 fee = abi.decode(feeData[i], (uint24));
            require(tokens[i + 1] != address(0), PoolKeyMissing());
            path = bytes.concat(path, abi.encodePacked(fee, tokens[i + 1]));
        }
    }
}
