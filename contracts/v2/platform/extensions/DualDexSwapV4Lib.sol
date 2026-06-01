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

/// @notice Minimal interface shared by Uniswap v3-style and PancakeSwap v3-style exact-input routers.
interface IV3RouterLike {
    /// @notice Parameters for a single-hop exact-input swap.
    struct ExactInputSingleParams {
        /// @notice ERC-20 token spent by the caller.
        address tokenIn;
        /// @notice ERC-20 token delivered to `recipient`.
        address tokenOut;
        /// @notice Pool fee tier for the pair.
        uint24 fee;
        /// @notice Address receiving `tokenOut`.
        address recipient;
        /// @notice Router deadline timestamp.
        uint256 deadline;
        /// @notice Exact amount of `tokenIn` to spend.
        uint256 amountIn;
        /// @notice Minimum acceptable amount of `tokenOut`.
        uint256 amountOutMinimum;
        /// @notice Optional price limit; this library always passes zero.
        uint160 sqrtPriceLimitX96;
    }

    /// @notice Parameters for a multi-hop exact-input swap.
    struct ExactInputParams {
        /// @notice Packed path encoded as token, fee, token, fee, token...
        bytes path;
        /// @notice Address receiving the final output token.
        address recipient;
        /// @notice Router deadline timestamp.
        uint256 deadline;
        /// @notice Exact amount of the first path token to spend.
        uint256 amountIn;
        /// @notice Minimum acceptable amount of the final path token.
        uint256 amountOutMinimum;
    }

    /// @notice Executes a single-hop exact-input swap.
    /// @param params Swap parameters accepted by the v3-style router.
    /// @return amountOut Amount returned by the router.
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);

    /// @notice Executes a multi-hop exact-input swap.
    /// @param params Packed-path swap parameters accepted by the v3-style router.
    /// @return amountOut Amount returned by the router.
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

/// @notice Minimal Universal Router interface used for v4 swap commands.
interface IUniversalRouterLike {
    /// @notice Executes commands without an explicit deadline.
    /// @param commands Encoded command bytes.
    /// @param inputs Command-specific payloads.
    function execute(bytes calldata commands, bytes[] calldata inputs) external payable;

    /// @notice Executes commands with an explicit deadline.
    /// @param commands Encoded command bytes.
    /// @param inputs Command-specific payloads.
    /// @param deadline Timestamp after which the router should revert.
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}

/// @notice Minimal Permit2 allowance interface used by v4 Universal Router integrations.
interface IAllowanceTransferLike {
    /// @notice Approves `spender` to spend `token` through Permit2.
    /// @param token ERC-20 token being approved.
    /// @param spender Address receiving the Permit2 allowance.
    /// @param amount Allowance amount, stored as uint160 by Permit2.
    /// @param expiration Permit2 allowance expiration timestamp.
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

/**
 * @title DualDexSwapV4Lib
 * @notice Stateless exact-input swap helper for Uniswap v4, PancakeSwap Infinity CL, and v3-style routers.
 * @dev
 * - The caller must hold the input ERC-20 tokens before calling a swap function.
 * - The library approves the configured router for the exact input amount, executes the swap, then clears approvals.
 * - For UniV4 and PcsV4, the library also approves the chain-specific Permit2 contract when code exists there.
 * - Native currency input is not supported; wrap native assets before routing through this library.
 * - Output amounts are measured as the recipient's ERC-20 balance delta, then checked against `amountOutMinimum`.
 */
library DualDexSwapV4Lib {
    using SafeTransferLib for address;

    address private constant UNI_PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address private constant PCS_PERMIT2 = 0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768;
    bytes1 private constant UNIVERSAL_ROUTER_V4_SWAP = 0x10;

    /// @notice Reverts when a provided pool key does not contain the requested token pair.
    /// @param tokenIn Requested input token.
    /// @param tokenOut Requested output token.
    error PoolTokenMismatch(address tokenIn, address tokenOut);

    /// @notice Reverts when no router is configured for the selected DEX type.
    /// @param dexType DEX type being routed.
    error RouterNotConfigured(DexType dexType);

    /// @notice Reverts when a required pool key, fee tier, or path element is missing or malformed.
    error PoolKeyMissing();

    /// @notice Reserved for amount values that cannot fit downstream router or Permit2 integer widths.
    /// @param amount Amount that is too large.
    error AmountTooLarge(uint256 amount);

    /// @notice Reverts when a swap recipient is the zero address.
    error InvalidRecipient();

    /// @notice Reverts when the recipient balance delta is lower than the requested minimum output.
    error QuoteFailed();

    /// @notice Reverts when an exact-input swap is called with a zero input amount.
    error ZeroAmountIn();

    /// @notice Reverts when native currency is supplied as the input token.
    error NativeInputUnsupported();

    /// @notice Supported DEX integrations for the dual swap helper.
    enum DexType {
        /// @notice Uniswap v4 Universal Router.
        UniV4,
        /// @notice PancakeSwap Infinity CL Universal Router.
        PcsV4,
        /// @notice PancakeSwap v3-style exact-input router.
        PcsV3,
        /// @notice Uniswap v3-style exact-input router.
        UniV3
    }

    /// @notice Common swap executor parameters for a single-hop pair.
    struct ExactInputSingleParams {
        /// @notice ERC-20 token spent by the caller.
        address tokenIn;
        /// @notice ERC-20 token delivered to `recipient`.
        address tokenOut;
        /// @notice Exact amount of `tokenIn` to spend, in token-native decimals.
        uint256 amountIn;
        /// @notice Minimum acceptable `tokenOut`, in token-native decimals.
        uint256 amountOutMinimum;
        /// @notice Router deadline timestamp; zero uses the router path's default deadline behavior.
        uint256 deadline;
        /// @notice ABI-encoded `PoolKey` for v4 routes, or ABI-encoded `uint24` fee tier for v3 routes.
        bytes poolKey;
        /// @notice Hook data forwarded to v4 routers; ignored by v3 routers.
        bytes hookData;
        /// @notice Address receiving `tokenOut`.
        address recipient;
    }

    /// @notice Multi-hop swap parameters across a path of pools.
    struct ExactInputMultiParams {
        /// @notice Ordered token route: `[tokenIn, intermediate..., tokenOut]`.
        address[] tokens;
        /// @notice Per-hop ABI-encoded v4 `PoolKey` or v3 `uint24` fee tier; length must be `tokens.length - 1`.
        bytes[] poolKeys;
        /// @notice Exact amount of `tokens[0]` to spend, in token-native decimals.
        uint256 amountIn;
        /// @notice Minimum acceptable final-token output, in token-native decimals.
        uint256 amountOutMinimum;
        /// @notice Router deadline timestamp; zero uses the router path's default deadline behavior.
        uint256 deadline;
        /// @notice Hook data forwarded to every v4 hop; ignored by v3 routes.
        bytes hookData;
        /// @notice Address receiving the final output token.
        address recipient;
    }

    /// @notice DEX routing, token, and quote configuration used by the swap helpers.
    /// @dev `slippageBps` is named for legacy compatibility but uses Helper's 27-decimal scale.
    struct PaymentsInfo {
        /// @notice Selected router family.
        DexType dexType;
        /// @notice Slippage tolerance in Helper's 27-decimal domain, where 1e27 is 100%.
        uint96 slippageBps;
        /// @notice Router address for the selected `dexType`.
        address router;
        /// @notice Stable payment token used by convenience USDtoken/LONG helpers.
        address usdToken;
        /// @notice LONG token address used by convenience USDtoken/LONG helpers.
        address long;
        /// @notice Maximum allowed age, in seconds, for price feed data used by upstream quoting logic.
        uint256 maxPriceFeedDelay;
        /// @notice Default single-hop pool encoding for the convenience USDtoken/LONG helpers.
        /// @dev ABI-encoded v4 `PoolKey` or ABI-encoded v3 `uint24` fee tier.
        bytes poolKey;
        /// @notice Default v4 hook data for the convenience USDtoken/LONG helpers.
        bytes hookData;
    }

    // ========== External API ==========

    /// @notice Executes an exact-input single-hop swap on the configured DEX.
    /// @dev
    /// Reverts unless `params.amountIn` is positive, `params.recipient` is nonzero, `info.router` is configured,
    /// and `params.poolKey` matches the selected route type. The caller must already hold `params.amountIn`.
    /// @param info DEX routing configuration.
    /// @param params Single-hop swap parameters.
    /// @return received The amount of `tokenOut` delivered to `params.recipient`.
    function swapExact(PaymentsInfo memory info, ExactInputSingleParams memory params)
        external
        returns (uint256 received)
    {
        return _swapExact(info, params);
    }

    /// @notice Executes an exact-input multi-hop swap (path) on the configured dex.
    /// @dev
    /// `params.tokens` must contain at least two addresses and `params.poolKeys.length` must equal
    /// `params.tokens.length - 1`. For v4 routes, each pool key is decoded and validated against its hop tokens.
    /// @param info DEX routing configuration.
    /// @param params Multi-hop swap path and execution parameters.
    /// @return received The amount of the final path token delivered to `params.recipient`.
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

    /// @notice Swaps the configured USDtoken to LONG for a recipient.
    /// @dev Returns zero without side effects when `recipient` is zero or `amount` is zero.
    /// @param info DEX routing configuration containing `usdToken`, `long`, `poolKey`, and `hookData`.
    /// @param recipient Address receiving the LONG output.
    /// @param amount Exact USDtoken amount to swap, in USDtoken-native decimals.
    /// @param amountOutMinimum Minimum acceptable LONG output.
    /// @param deadline Router deadline timestamp; zero uses the selected router path's default behavior.
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

    /// @notice Swaps LONG to the configured USDtoken for a recipient.
    /// @dev Returns zero without side effects when `recipient` is zero or `amount` is zero.
    /// @param info DEX routing configuration containing `long`, `usdToken`, `poolKey`, and `hookData`.
    /// @param recipient Address receiving the USDtoken output.
    /// @param amount Exact LONG amount to swap, in LONG-native decimals.
    /// @param amountOutMinimum Minimum acceptable USDtoken output.
    /// @param deadline Router deadline timestamp; zero uses the selected router path's default behavior.
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

    /// @notice Internal implementation shared by the single-hop external entrypoints.
    /// @dev Measures actual output using `params.tokenOut.balanceOf(params.recipient)` before and after the swap.
    /// @param info DEX routing configuration.
    /// @param params Single-hop swap parameters.
    /// @return received Recipient balance delta for `params.tokenOut`.
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

    /// @notice Executes a single-hop Uniswap v4 swap through the Universal Router.
    /// @dev Builds a SWAP_EXACT_IN_SINGLE, SETTLE, TAKE action bundle.
    /// @param info DEX routing configuration.
    /// @param params Single-hop swap parameters with an ABI-encoded Uniswap v4 `PoolKey`.
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

    /// @notice Executes a single-hop PancakeSwap Infinity CL swap through the Universal Router.
    /// @dev Builds a CL_SWAP_EXACT_IN_SINGLE plan and finalizes it with Pancake's Planner library.
    /// @param info DEX routing configuration.
    /// @param params Single-hop swap parameters with an ABI-encoded PancakeSwap Infinity `PoolKey`.
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

    /// @notice Executes a single-hop v3-style exact-input swap.
    /// @dev Decodes `params.poolKey` as a `uint24` fee tier. A zero deadline is converted to `block.timestamp`.
    /// @param info DEX routing configuration.
    /// @param params Single-hop swap parameters.
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

    /// @notice Executes a Uniswap v4 multi-hop path through the Universal Router.
    /// @dev Uses exact input on the first hop and open-delta accounting for intermediate hops.
    /// @param info DEX routing configuration.
    /// @param params Multi-hop path with ABI-encoded Uniswap v4 `PoolKey` values.
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

    /// @notice Executes a PancakeSwap Infinity CL multi-hop path through the Universal Router.
    /// @dev Uses exact input on the first hop and open-delta accounting for intermediate hops.
    /// @param info DEX routing configuration.
    /// @param params Multi-hop path with ABI-encoded PancakeSwap Infinity `PoolKey` values.
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

    /// @notice Executes a v3-style multi-hop exact-input swap.
    /// @dev Decodes every `poolKeys[i]` value as a `uint24` fee tier and packs the v3 path.
    /// @param info DEX routing configuration.
    /// @param params Multi-hop path parameters.
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

    /// @notice Grants router and optional Permit2 allowances needed for a swap.
    /// @dev Permit2 approval is skipped when no code exists at the chain-specific Permit2 address.
    /// @param info DEX routing configuration.
    /// @param token ERC-20 input token.
    /// @param amount Exact allowance amount to grant.
    function _approveForSwap(PaymentsInfo memory info, address token, uint256 amount) private {
        token.safeApproveWithRetry(info.router, amount);

        address permit2 = _permit2ForDex(info.dexType);
        if (permit2 != address(0) && permit2.code.length != 0) {
            token.safeApproveWithRetry(permit2, amount);
            IAllowanceTransferLike(permit2).approve(token, info.router, SafeCastLib.toUint160(amount), type(uint48).max);
        }
    }

    /// @notice Clears router and optional Permit2 allowances after a successful swap.
    /// @param info DEX routing configuration.
    /// @param token ERC-20 input token.
    function _clearApprovalForSwap(PaymentsInfo memory info, address token) private {
        token.safeApprove(info.router, 0);

        address permit2 = _permit2ForDex(info.dexType);
        if (permit2 != address(0) && permit2.code.length != 0) {
            IAllowanceTransferLike(permit2).approve(token, info.router, 0, 0);
            token.safeApprove(permit2, 0);
        }
    }

    /// @notice Returns the Permit2 contract used by a v4 DEX integration.
    /// @param dexType DEX type being routed.
    /// @return permit2 Permit2 contract address, or zero for v3-style routes.
    function _permit2ForDex(DexType dexType) private pure returns (address) {
        if (dexType == DexType.UniV4) {
            return UNI_PERMIT2;
        }
        if (dexType == DexType.PcsV4) {
            return PCS_PERMIT2;
        }
        return address(0);
    }

    /// @notice Executes a v4 swap payload through the configured Universal Router.
    /// @dev A zero deadline calls the no-deadline overload; otherwise the deadline overload is used.
    /// @param router Universal Router address.
    /// @param payload V4 action payload.
    /// @param deadline Optional router deadline timestamp.
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

    /// @notice Validates a Uniswap v4 pool key against an exact input/output token pair.
    /// @param poolKey Decoded Uniswap v4 pool key.
    /// @param tokenIn Requested input token.
    /// @param tokenOut Requested output token.
    /// @return zeroForOne True when swapping currency0 for currency1.
    /// @return outputCurrency Pool currency delivered by the swap.
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

    /// @notice Validates a PancakeSwap Infinity pool key against an exact input/output token pair.
    /// @param poolKey Decoded PancakeSwap Infinity pool key.
    /// @param tokenIn Requested input token.
    /// @param tokenOut Requested output token.
    /// @return zeroForOne True when swapping currency0 for currency1.
    /// @return outputCurrency Pool currency delivered by the swap.
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

    /// @notice Decodes a v3 fee tier from encoded route data.
    /// @param data ABI-encoded `uint24` fee tier.
    /// @return fee Decoded pool fee tier.
    function _decodeV3Fee(bytes memory data) private pure returns (uint24 fee) {
        require(data.length > 0, PoolKeyMissing());
        fee = abi.decode(data, (uint24));
    }

    /// @notice Builds a packed v3 multi-hop path from tokens and encoded fee tiers.
    /// @param tokens Ordered token route.
    /// @param feeData ABI-encoded `uint24` fee tier for each hop.
    /// @return path Packed v3 path encoded as token, fee, token, fee, token...
    function _buildV3Path(address[] memory tokens, bytes[] memory feeData) private pure returns (bytes memory path) {
        require(tokens.length >= 2 && feeData.length == tokens.length - 1 && tokens[0] != address(0), PoolKeyMissing());

        path = abi.encodePacked(tokens[0]);
        for (uint256 i = 0; i < feeData.length; i++) {
            uint24 fee = abi.decode(feeData[i], (uint24));
            require(tokens[i + 1] != address(0), PoolKeyMissing());
            path = bytes.concat(path, abi.encodePacked(fee, tokens[i + 1]));
        }
    }
}
