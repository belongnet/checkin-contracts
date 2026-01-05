# MockV2Router
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/mocks/MockV2Router.sol)

Minimal Uniswap v2 style router/quoter mock with a fixed exchange rate.


## State Variables
### usdToken

```solidity
IERC20 public immutable usdToken
```


### longToken

```solidity
IERC20 public immutable longToken
```


### rate
LONG per USD scaled to 1e18.


```solidity
uint256 public rate
```


## Functions
### constructor


```solidity
constructor(address usdToken_, address longToken_, uint256 rate_) ;
```

### setRate


```solidity
function setRate(uint256 newRate) external;
```

### exactInputSingle


```solidity
function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
```

### exactInput


```solidity
function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
```

### swapExactTokensForTokens


```solidity
function swapExactTokensForTokens(
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256
) external returns (uint256[] memory amounts);
```

### getAmountsOut


```solidity
function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
```

### _swap


```solidity
function _swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address to)
    private
    returns (uint256 amountOut);
```

### _decodeExactInputPath


```solidity
function _decodeExactInputPath(bytes calldata path) private pure returns (address tokenIn, address tokenOut);
```

### _readAddress


```solidity
function _readAddress(bytes calldata data, uint256 start) private pure returns (address addr);
```

### _quote


```solidity
function _quote(address tokenIn, address tokenOut, uint256 amountIn) internal view returns (uint256);
```

## Structs
### ExactInputSingleParams

```solidity
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
```

### ExactInputParams

```solidity
struct ExactInputParams {
    bytes path;
    address recipient;
    uint256 deadline;
    uint256 amountIn;
    uint256 amountOutMinimum;
}
```

