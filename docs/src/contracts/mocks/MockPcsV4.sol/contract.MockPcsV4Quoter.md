# MockPcsV4Quoter
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/mocks/MockPcsV4.sol)

**Inherits:**
[ICLQuoter](/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-cl/interfaces/ICLQuoter.sol/interface.ICLQuoter.md)

PancakeSwap v4 quoter mock that mirrors the router's static pricing.


## State Variables
### usdToken

```solidity
address public immutable usdToken
```


### longToken

```solidity
address public immutable longToken
```


### rate

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

### quoteExactInputSingle


```solidity
function quoteExactInputSingle(QuoteExactSingleParams memory params)
    public
    view
    override
    returns (uint256 amountOut, uint256 gasEstimate);
```

### quoteExactInputSingleList


```solidity
function quoteExactInputSingleList(QuoteExactSingleParams[] memory params)
    external
    view
    override
    returns (uint256 amountOut, uint256 gasEstimate);
```

### quoteExactInput


```solidity
function quoteExactInput(QuoteExactParams memory) external pure override returns (uint256, uint256);
```

### quoteExactOutputSingle


```solidity
function quoteExactOutputSingle(QuoteExactSingleParams memory) external pure override returns (uint256, uint256);
```

### quoteExactOutput


```solidity
function quoteExactOutput(QuoteExactParams memory) external pure override returns (uint256, uint256);
```

### _quote


```solidity
function _quote(address tokenIn, address tokenOut, uint256 amountIn) internal view returns (uint256);
```

