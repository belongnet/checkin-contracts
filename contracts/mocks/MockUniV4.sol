// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IActionExecutor} from "../v2/interfaces/IActionExecutor.sol";
import {IV4Router as IUniV4Router} from "@uniswap/v4-periphery/src/interfaces/IV4Router.sol";
import {IV4Quoter} from "@uniswap/v4-periphery/src/interfaces/IV4Quoter.sol";

/// @notice Minimal Uniswap v4 router mock that swaps at a fixed rate.
contract MockUniV4Router is IActionExecutor {
    IERC20 public immutable usdToken;
    IERC20 public immutable longToken;

    /// @dev LONG per USD scaled by 1e18 (1e18 == 1:1).
    uint256 public rate;

    event MockSwap(address indexed caller, address indexed recipient, uint256 amountIn, uint256 amountOut);

    constructor(address usdToken_, address longToken_, uint256 rate_) {
        require(usdToken_ != address(0) && longToken_ != address(0), "MockUniV4Router: zero addr");
        usdToken = IERC20(usdToken_);
        longToken = IERC20(longToken_);
        rate = rate_;
    }

    function setRate(uint256 newRate) external {
        require(newRate != 0, "MockUniV4Router: zero rate");
        rate = newRate;
    }

    function executeActions(bytes calldata payload) external payable override {
        (bytes memory actions, bytes[] memory params) = abi.decode(payload, (bytes, bytes[]));
        require(actions.length > 0 && params.length > 0, "MockUniV4Router: empty plan");

        IUniV4Router.ExactInputSingleParams memory swapParams =
            abi.decode(params[0], (IUniV4Router.ExactInputSingleParams));

        address tokenIn = swapParams.zeroForOne ? address(usdToken) : address(longToken);
        address tokenOut = swapParams.zeroForOne ? address(longToken) : address(usdToken);

        (, address recipient,) = abi.decode(params[params.length - 1], (address, address, uint256));

        uint256 amountIn = uint256(swapParams.amountIn);
        if (amountIn == 0) return;

        uint256 amountOut = swapParams.zeroForOne ? (amountIn * rate) / 1e18 : (amountIn * 1e18) / rate;
        if (amountOut < uint256(swapParams.amountOutMinimum)) revert("MockUniV4Router: slippage");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(recipient, amountOut);

        emit MockSwap(msg.sender, recipient, amountIn, amountOut);
    }
}

/// @notice Uniswap v4 quoter mock mirroring the router's static pricing.
contract MockUniV4Quoter {
    address public immutable usdToken;
    address public immutable longToken;
    uint256 public rate;

    constructor(address usdToken_, address longToken_, uint256 rate_) {
        require(usdToken_ != address(0) && longToken_ != address(0), "MockUniV4Quoter: zero addr");
        usdToken = usdToken_;
        longToken = longToken_;
        rate = rate_;
    }

    function setRate(uint256 newRate) external {
        require(newRate != 0, "MockUniV4Quoter: zero rate");
        rate = newRate;
    }

    function quoteExactInputSingle(IV4Quoter.QuoteExactSingleParams memory params)
        public
        view
        returns (uint256 amountOut, uint256 gasEstimate)
    {
        uint256 amountIn = uint256(params.exactAmount);
        if (amountIn == 0) return (0, 0);
        amountOut = params.zeroForOne ? (amountIn * rate) / 1e18 : (amountIn * 1e18) / rate;
        gasEstimate = 0;
    }

    function quoteExactInputSingleList(IV4Quoter.QuoteExactSingleParams[] memory params)
        external
        view
        returns (uint256 amountOut, uint256 gasEstimate)
    {
        require(params.length > 0, "MockUniV4Quoter: empty params");
        return quoteExactInputSingle(params[params.length - 1]);
    }

    function quoteExactInput(IV4Quoter.QuoteExactParams memory) external pure returns (uint256, uint256) {
        revert("MockUniV4Quoter: not implemented");
    }

    function quoteExactOutputSingle(IV4Quoter.QuoteExactSingleParams memory) external pure returns (uint256, uint256) {
        revert("MockUniV4Quoter: not implemented");
    }

    function quoteExactOutput(IV4Quoter.QuoteExactParams memory) external pure returns (uint256, uint256) {
        revert("MockUniV4Quoter: not implemented");
    }
}
