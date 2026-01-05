# V3SmartRouterHelper
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/libraries/external/V3SmartRouterHelper.sol)

Copy from https://github.com/pancakeswap/pancake-v3-contracts/blob/main/projects/router/contracts/libraries/SmartRouterHelper.sol


## Functions
### getStableInfo

Stable *************************************************


```solidity
function getStableInfo(address stableSwapFactory, address input, address output, uint256 flag)
    internal
    view
    returns (uint256 i, uint256 j, address swapContract);
```

### sortTokens

V2 *************************************************


```solidity
function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1);
```

### pairFor

PancakeSwap is a multichain DEX, we have different factories on different chains.
If we use the CREATE2 rule to calculate the pool address, we need to update the INIT_CODE_HASH for each chain.
And quoter functions are not gas efficient and should _not_ be called on chain.


```solidity
function pairFor(address factory, address tokenA, address tokenB) internal view returns (address pair);
```

### getReserves


```solidity
function getReserves(address factory, address tokenA, address tokenB)
    internal
    view
    returns (uint256 reserveA, uint256 reserveB);
```

### getAmountOut


```solidity
function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
    internal
    pure
    returns (uint256 amountOut);
```

### getAmountIn


```solidity
function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut)
    internal
    pure
    returns (uint256 amountIn);
```

### getAmountsIn


```solidity
function getAmountsIn(address factory, uint256 amountOut, address[] memory path)
    internal
    view
    returns (uint256[] memory amounts);
```

### getPool

V3 *************************************************

Returns the pool for the given token pair and fee. The pool contract may or may not exist.

PancakeSwap is a multichain DEX, we have different factories on different chains.
If we use the CREATE2 rule to calculate the pool address, we need to update the INIT_CODE_HASH for each chain.
And quoter functions are not gas efficient and should _not_ be called on chain.


```solidity
function getPool(address factory, address tokenA, address tokenB, uint24 fee)
    internal
    view
    returns (IPancakeV3Pool);
```

### verifyCallback

Returns the address of a valid PancakeSwap V3 Pool


```solidity
function verifyCallback(address factory, address tokenA, address tokenB, uint24 fee)
    internal
    view
    returns (IPancakeV3Pool pool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`factory`|`address`|The contract address of the PancakeSwap V3 factory|
|`tokenA`|`address`|The contract address of either token0 or token1|
|`tokenB`|`address`|The contract address of the other token|
|`fee`|`uint24`|The fee collected upon every swap in the pool, denominated in hundredths of a bip|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`pool`|`IPancakeV3Pool`|The V3 pool contract address|


