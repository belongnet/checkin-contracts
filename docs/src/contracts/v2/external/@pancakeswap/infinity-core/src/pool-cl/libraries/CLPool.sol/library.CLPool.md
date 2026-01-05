# CLPool
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-cl/libraries/CLPool.sol)

a library with all actions that can be performed on cl pool


## Functions
### initialize


```solidity
function initialize(State storage self, uint160 sqrtPriceX96, uint24 protocolFee, uint24 lpFee)
    internal
    returns (int24 tick);
```

### modifyLiquidity

Effect changes to the liquidity of a position in a pool


```solidity
function modifyLiquidity(State storage self, ModifyLiquidityParams memory params)
    internal
    returns (BalanceDelta delta, BalanceDelta feeDelta);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`State`||
|`params`|`ModifyLiquidityParams`|the position details and the change to the position's liquidity to effect|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`delta`|`BalanceDelta`|the deltas from liquidity changes|
|`feeDelta`|`BalanceDelta`|the delta of the fees generated in the liquidity range|


### swap


```solidity
function swap(State storage self, SwapParams memory params)
    internal
    returns (BalanceDelta balanceDelta, SwapState memory state);
```

### _updatePosition


```solidity
function _updatePosition(State storage self, ModifyLiquidityParams memory params, int24 tick)
    internal
    returns (uint256, uint256);
```

### donate

Donates are in fact giving token to in-ranged liquidity providers only


```solidity
function donate(State storage state, uint256 amount0, uint256 amount1)
    internal
    returns (BalanceDelta delta, int24 tick);
```

### setProtocolFee


```solidity
function setProtocolFee(State storage self, uint24 protocolFee) internal;
```

### setLPFee

Only dynamic fee pools may update the lp fee.


```solidity
function setLPFee(State storage self, uint24 lpFee) internal;
```

### checkPoolInitialized


```solidity
function checkPoolInitialized(State storage self) internal view;
```

## Errors
### PoolAlreadyInitialized
Thrown when trying to initialize an already initialized pool


```solidity
error PoolAlreadyInitialized();
```

### PoolNotInitialized
Thrown when trying to interact with a non-initialized pool


```solidity
error PoolNotInitialized();
```

### InvalidFeeForExactOut
Thrown when trying to swap with max lp fee and specifying an output amount


```solidity
error InvalidFeeForExactOut();
```

### InvalidSqrtPriceLimit
Thrown when sqrtPriceLimitX96 is out of range


```solidity
error InvalidSqrtPriceLimit(uint160 sqrtPriceCurrentX96, uint160 sqrtPriceLimitX96);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sqrtPriceCurrentX96`|`uint160`|current price in the pool|
|`sqrtPriceLimitX96`|`uint160`|The price limit specified by user|

### NoLiquidityToReceiveFees
Thrown by donate if there is currently 0 liquidity, since the fees will not go to any liquidity providers


```solidity
error NoLiquidityToReceiveFees();
```

## Structs
### State
The state of a pool

feeGrowthGlobal can be artificially inflated
For pools with a single liquidity position, actors can donate to themselves to freely inflate feeGrowthGlobal
atomically donating and collecting fees in the same lockAcquired callback may make the inflated value more extreme


```solidity
struct State {
    CLSlot0 slot0;
    /// @dev accumulated lp fees
    uint256 feeGrowthGlobal0X128;
    uint256 feeGrowthGlobal1X128;
    /// @dev current active liquidity
    uint128 liquidity;
    mapping(int24 tick => Tick.Info info) ticks;
    mapping(int16 pos => uint256 bitmap) tickBitmap;
    mapping(bytes32 positionHash => CLPosition.Info info) positions;
}
```

### ModifyLiquidityParams

```solidity
struct ModifyLiquidityParams {
    // the address that owns the position
    address owner;
    // the lower and upper tick of the position
    int24 tickLower;
    int24 tickUpper;
    // any change in liquidity
    int128 liquidityDelta;
    // the spacing between ticks
    int24 tickSpacing;
    // used to distinguish positions of the same owner, at the same tick range
    bytes32 salt;
}
```

### SwapState

```solidity
struct SwapState {
    // the amount remaining to be swapped in/out of the input/output asset
    int256 amountSpecifiedRemaining;
    // the amount already swapped out/in of the output/input asset
    int256 amountCalculated;
    // current sqrt(price)
    uint160 sqrtPriceX96;
    // the tick associated with the current price
    int24 tick;
    // the swapFee (the total percentage charged within a swap, including the protocol fee and the LP fee)
    uint24 swapFee;
    // the single direction protocol fee for the swap
    uint16 protocolFee;
    // the global fee growth of the input token
    uint256 feeGrowthGlobalX128;
    // amount of input token paid as protocol fee
    uint256 feeAmountToProtocol;
    // the current liquidity in range
    uint128 liquidity;
}
```

### StepComputations

```solidity
struct StepComputations {
    // the price at the beginning of the step
    uint160 sqrtPriceStartX96;
    // the next tick to swap to from the current tick in the swap direction
    int24 tickNext;
    // whether tickNext is initialized or not
    bool initialized;
    // sqrt(price) for the next tick (1/0)
    uint160 sqrtPriceNextX96;
    // how much is being swapped in in this step
    uint256 amountIn;
    // how much is being swapped out
    uint256 amountOut;
    // how much fee is being paid in
    uint256 feeAmount;
}
```

### SwapParams

```solidity
struct SwapParams {
    int24 tickSpacing;
    bool zeroForOne;
    int256 amountSpecified;
    uint160 sqrtPriceLimitX96;
    uint24 lpFeeOverride;
}
```

### UpdatePositionCache

```solidity
struct UpdatePositionCache {
    bool flippedLower;
    bool flippedUpper;
    uint256 feeGrowthInside0X128;
    uint256 feeGrowthInside1X128;
    uint256 feesOwed0;
    uint256 feesOwed1;
    uint128 maxLiquidityPerTick;
}
```

