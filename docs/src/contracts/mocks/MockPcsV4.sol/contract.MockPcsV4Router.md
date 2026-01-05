# MockPcsV4Router
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/mocks/MockPcsV4.sol)

**Inherits:**
[IActionExecutor](/contracts/v2/interfaces/IActionExecutor.sol/interface.IActionExecutor.md)

Minimal PancakeSwap v4 router mock that consumes USDtoken and releases LONG at a fixed rate.


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
LONG per USD scaled by 1e18 (1e18 == 1:1).


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

### executeActions


```solidity
function executeActions(bytes calldata payload) external payable override;
```

### _quote


```solidity
function _quote(address tokenIn, address tokenOut, uint256 amountIn) internal view returns (uint256);
```

## Events
### MockSwap

```solidity
event MockSwap(address indexed caller, address indexed recipient, uint256 amountIn, uint256 amountOut);
```

