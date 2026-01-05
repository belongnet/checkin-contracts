# MockUniV4Quoter
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/mocks/MockUniV4.sol)

Uniswap v4 quoter mock mirroring the router's static pricing.


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
function quoteExactInputSingle(IV4Quoter.QuoteExactSingleParams memory params)
    public
    view
    returns (uint256 amountOut, uint256 gasEstimate);
```

### quoteExactInputSingleList


```solidity
function quoteExactInputSingleList(IV4Quoter.QuoteExactSingleParams[] memory params)
    external
    view
    returns (uint256 amountOut, uint256 gasEstimate);
```

### quoteExactInput


```solidity
function quoteExactInput(IV4Quoter.QuoteExactParams memory) external pure returns (uint256, uint256);
```

### quoteExactOutputSingle


```solidity
function quoteExactOutputSingle(IV4Quoter.QuoteExactSingleParams memory) external pure returns (uint256, uint256);
```

### quoteExactOutput


```solidity
function quoteExactOutput(IV4Quoter.QuoteExactParams memory) external pure returns (uint256, uint256);
```

