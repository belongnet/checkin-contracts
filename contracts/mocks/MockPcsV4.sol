// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IActionExecutor} from "../v2/interfaces/IActionExecutor.sol";
import {ICLRouterBase} from "../v2/external/@pancakeswap/infinity-periphery/src/pool-cl/interfaces/ICLRouterBase.sol";
import {ICLQuoter} from "../v2/external/@pancakeswap/infinity-periphery/src/pool-cl/interfaces/ICLQuoter.sol";
import {IQuoter} from "../v2/external/@pancakeswap/infinity-periphery/src/interfaces/IQuoter.sol";
import {Currency} from "../v2/external/@pancakeswap/infinity-core/src/types/Currency.sol";

/// @notice Minimal PancakeSwap v4 router mock that consumes USDtoken and releases LONG at a fixed rate.
contract MockPcsV4Router is IActionExecutor {
    IERC20 public immutable usdToken;
    IERC20 public immutable longToken;

    /// @dev LONG per USD scaled by 1e18 (1e18 == 1:1).
    uint256 public rate;

    event MockSwap(address indexed caller, address indexed recipient, uint256 amountIn, uint256 amountOut);

    constructor(address usdToken_, address longToken_, uint256 rate_) {
        require(usdToken_ != address(0) && longToken_ != address(0), "MockPcsV4Router: zero addr");
        usdToken = IERC20(usdToken_);
        longToken = IERC20(longToken_);
        rate = rate_;
    }

    function setRate(uint256 newRate) external {
        require(newRate != 0, "MockPcsV4Router: zero rate");
        rate = newRate;
    }

    function executeActions(bytes calldata payload) external payable override {
        (bytes memory actions, bytes[] memory params) = abi.decode(payload, (bytes, bytes[]));
        require(actions.length > 0 && params.length > 0, "MockPcsV4Router: empty plan");

        ICLRouterBase.CLSwapExactInputSingleParams memory swapParams =
            abi.decode(params[0], (ICLRouterBase.CLSwapExactInputSingleParams));

        address currency0 = Currency.unwrap(swapParams.poolKey.currency0);
        address currency1 = Currency.unwrap(swapParams.poolKey.currency1);
        address tokenIn = swapParams.zeroForOne ? currency0 : currency1;
        address tokenOut = swapParams.zeroForOne ? currency1 : currency0;

        (, address recipient,) = abi.decode(params[params.length - 1], (address, address, uint256));

        uint256 amountIn = uint256(swapParams.amountIn);
        require(amountIn > 0, "MockPcsV4Router: zero in");

        uint256 amountOut = _quote(tokenIn, tokenOut, amountIn);
        require(amountOut >= uint256(swapParams.amountOutMinimum), "MockPcsV4Router: slippage");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(recipient, amountOut);

        emit MockSwap(msg.sender, recipient, amountIn, amountOut);
    }

    function _quote(address tokenIn, address tokenOut, uint256 amountIn) internal view returns (uint256) {
        if (tokenIn == address(usdToken) && tokenOut == address(longToken)) {
            return (amountIn * rate) / 1e18;
        }
        if (tokenIn == address(longToken) && tokenOut == address(usdToken)) {
            return (amountIn * 1e18) / rate;
        }
        revert("MockPcsV4Router: pair");
    }
}

/// @notice PancakeSwap v4 quoter mock that mirrors the router's static pricing.
contract MockPcsV4Quoter is ICLQuoter {
    address public immutable usdToken;
    address public immutable longToken;
    uint256 public rate;

    constructor(address usdToken_, address longToken_, uint256 rate_) {
        require(usdToken_ != address(0) && longToken_ != address(0), "MockPcsV4Quoter: zero addr");
        usdToken = usdToken_;
        longToken = longToken_;
        rate = rate_;
    }

    function setRate(uint256 newRate) external {
        require(newRate != 0, "MockPcsV4Quoter: zero rate");
        rate = newRate;
    }

    function quoteExactInputSingle(QuoteExactSingleParams memory params)
        public
        view
        override
        returns (uint256 amountOut, uint256 gasEstimate)
    {
        address currency0 = Currency.unwrap(params.poolKey.currency0);
        address currency1 = Currency.unwrap(params.poolKey.currency1);
        address tokenIn = params.zeroForOne ? currency0 : currency1;
        address tokenOut = params.zeroForOne ? currency1 : currency0;

        amountOut = _quote(tokenIn, tokenOut, uint256(params.exactAmount));
        gasEstimate = 0;
    }

    function quoteExactInputSingleList(QuoteExactSingleParams[] memory params)
        external
        view
        override
        returns (uint256 amountOut, uint256 gasEstimate)
    {
        require(params.length > 0, "MockPcsV4Quoter: empty params");
        return quoteExactInputSingle(params[params.length - 1]);
    }

    function quoteExactInput(QuoteExactParams memory) external pure override returns (uint256, uint256) {
        revert("MockPcsV4Quoter: not implemented");
    }

    function quoteExactOutputSingle(QuoteExactSingleParams memory) external pure override returns (uint256, uint256) {
        revert("MockPcsV4Quoter: not implemented");
    }

    function quoteExactOutput(QuoteExactParams memory) external pure override returns (uint256, uint256) {
        revert("MockPcsV4Quoter: not implemented");
    }

    function _quote(address tokenIn, address tokenOut, uint256 amountIn) internal view returns (uint256) {
        require(amountIn > 0, "MockPcsV4Quoter: zero amount");
        if (tokenIn == usdToken && tokenOut == longToken) {
            return (amountIn * rate) / 1e18;
        }
        if (tokenIn == longToken && tokenOut == usdToken) {
            return (amountIn * 1e18) / rate;
        }
        revert("MockPcsV4Quoter: pair");
    }
}
