// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Minimal Uniswap v2 style router/quoter mock with a fixed exchange rate.
contract MockV2Router {
    IERC20 public immutable usdToken;
    IERC20 public immutable longToken;

    /// @dev LONG per USD scaled to 1e18.
    uint256 public rate;

    constructor(address usdToken_, address longToken_, uint256 rate_) {
        require(usdToken_ != address(0) && longToken_ != address(0), "MockV2Router: zero addr");
        usdToken = IERC20(usdToken_);
        longToken = IERC20(longToken_);
        rate = rate_;
    }

    function setRate(uint256 newRate) external {
        require(newRate != 0, "MockV2Router: zero rate");
        rate = newRate;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256
    ) external returns (uint256[] memory amounts) {
        require(amountIn > 0, "MockV2Router: zero amount");
        require(path.length >= 2, "MockV2Router: path");

        address tokenIn = path[0];
        address tokenOut = path[path.length - 1];

        uint256 amountOut = _quote(tokenIn, tokenOut, amountIn);
        require(amountOut >= amountOutMin, "MockV2Router: slippage");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(to, amountOut);

        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[amounts.length - 1] = amountOut;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts) {
        require(amountIn > 0, "MockV2Router: zero amount");
        require(path.length >= 2, "MockV2Router: path");

        address tokenIn = path[0];
        address tokenOut = path[path.length - 1];

        uint256 amountOut = _quote(tokenIn, tokenOut, amountIn);

        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[amounts.length - 1] = amountOut;
    }

    function _quote(address tokenIn, address tokenOut, uint256 amountIn) internal view returns (uint256) {
        if (tokenIn == address(usdToken) && tokenOut == address(longToken)) {
            return (amountIn * rate) / 1e18;
        }
        if (tokenIn == address(longToken) && tokenOut == address(usdToken)) {
            return (amountIn * 1e18) / rate;
        }
        revert("MockV2Router: pair");
    }
}
