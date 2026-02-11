# ICLPoolManager
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/pool-cl/interfaces/ICLPoolManager.sol)

**Inherits:**
[IProtocolFees](/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IProtocolFees.sol/interface.IProtocolFees.md), [IPoolManager](/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IPoolManager.sol/interface.IPoolManager.md), [IExtsload](/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IExtsload.sol/interface.IExtsload.md)


## Functions
### getSlot0

Get the current value in slot0 of the given pool


```solidity
function getSlot0(PoolId id)
    external
    view
    returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee);
```

### getLiquidity

Get the current value of liquidity of the given pool


```solidity
function getLiquidity(PoolId id) external view returns (uint128 liquidity);
```

### getLiquidity

Get the current value of liquidity for the specified pool and position


```solidity
function getLiquidity(PoolId id, address owner, int24 tickLower, int24 tickUpper, bytes32 salt)
    external
    view
    returns (uint128 liquidity);
```

### getPoolTickInfo

Get the tick info about a specific tick in the pool


```solidity
function getPoolTickInfo(PoolId id, int24 tick) external view returns (Tick.Info memory);
```

### getPoolBitmapInfo

Get the tick bitmap info about a specific range (a word range) in the pool


```solidity
function getPoolBitmapInfo(PoolId id, int16 word) external view returns (uint256 tickBitmap);
```

### getFeeGrowthGlobals

Get the fee growth global for the given pool

feeGrowthGlobal can be artificially inflated by a malicious actor and integrators should be careful using the value
For pools with a single liquidity position, actors can donate to themselves to freely inflate feeGrowthGlobal
atomically donating and collecting fees in the same lockAcquired callback may make the inflated value more extreme


```solidity
function getFeeGrowthGlobals(PoolId id)
    external
    view
    returns (uint256 feeGrowthGlobal0x128, uint256 feeGrowthGlobal1x128);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`feeGrowthGlobal0x128`|`uint256`|The global fee growth for token0|
|`feeGrowthGlobal1x128`|`uint256`|The global fee growth for token1|


### getPosition

Get the position struct for a specified pool and position


```solidity
function getPosition(PoolId id, address owner, int24 tickLower, int24 tickUpper, bytes32 salt)
    external
    view
    returns (CLPosition.Info memory position);
```

### initialize

Initialize the state for a given pool ID


```solidity
function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24 tick);
```

### modifyLiquidity

Modify the position for the given pool

feeDelta can be artificially inflated by a malicious actor and integrators should be careful using the value
For pools with a single liquidity position, actors can donate to themselves to inflate feeGrowthGlobal (and consequently feeDelta)
atomically donating and collecting fees in the same lockAcquired callback may make the inflated value more extreme


```solidity
function modifyLiquidity(PoolKey memory key, ModifyLiquidityParams memory params, bytes calldata hookData)
    external
    returns (BalanceDelta delta, BalanceDelta feeDelta);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`delta`|`BalanceDelta`|The total balance delta of the caller of modifyLiquidity.|
|`feeDelta`|`BalanceDelta`|The balance delta of the fees generated in the liquidity range.|


### swap

Swap against the given pool

Swapping on low liquidity pools may cause unexpected swap amounts when liquidity available is less than amountSpecified.
Additionally note that if interacting with hooks that have the BEFORE_SWAP_RETURNS_DELTA_FLAG or AFTER_SWAP_RETURNS_DELTA_FLAG
the hook may alter the swap input/output. Integrators should perform checks on the returned swapDelta.


```solidity
function swap(PoolKey memory key, SwapParams memory params, bytes calldata hookData)
    external
    returns (BalanceDelta delta);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`key`|`PoolKey`|The pool to swap in|
|`params`|`SwapParams`|The parameters for swapping|
|`hookData`|`bytes`|Any data to pass to the callback|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`delta`|`BalanceDelta`|The balance delta of the address swapping|


### donate

Donate the given currency amounts to the in-range liquidity providers of a pool

Calls to donate can be frontrun adding just-in-time liquidity, with the aim of receiving a portion donated funds.
Donors should keep this in mind when designing donation mechanisms.

This function donates to in-range LPs at slot0.tick. In certain edge-cases of the swap algorithm, the `sqrtPrice` of
a pool can be at the lower boundary of tick `n`, but the `slot0.tick` of the pool is already `n - 1`. In this case a call to
`donate` would donate to tick `n - 1` (slot0.tick) not tick `n` (getTickAtSqrtPrice(slot0.sqrtPriceX96)).
Read the comments in `Pool.swap()` for more information about this.


```solidity
function donate(PoolKey memory key, uint256 amount0, uint256 amount1, bytes calldata hookData)
    external
    returns (BalanceDelta delta);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`key`|`PoolKey`|The pool to donate to|
|`amount0`|`uint256`|The amount of currency0 to donate|
|`amount1`|`uint256`|The amount of currency1 to donate|
|`hookData`|`bytes`|Any data to pass to the callback|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`delta`|`BalanceDelta`|The balance delta of the address donating|


## Events
### Initialize
Emitted when a new pool is initialized


```solidity
event Initialize(
    PoolId indexed id,
    Currency indexed currency0,
    Currency indexed currency1,
    IHooks hooks,
    uint24 fee,
    bytes32 parameters,
    uint160 sqrtPriceX96,
    int24 tick
);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`PoolId`|The abi encoded hash of the pool key struct for the new pool|
|`currency0`|`Currency`|The first currency of the pool by address sort order|
|`currency1`|`Currency`|The second currency of the pool by address sort order|
|`hooks`|`IHooks`|The hooks contract address for the pool, or address(0) if none|
|`fee`|`uint24`|The lp fee collected upon every swap in the pool, denominated in hundredths of a bip|
|`parameters`|`bytes32`|Includes hooks callback bitmap and tickSpacing|
|`sqrtPriceX96`|`uint160`|The sqrt(price) of the pool on initialization, as a Q64.96|
|`tick`|`int24`|The tick corresponding to the price of the pool on initialization|

### ModifyLiquidity
Emitted when a liquidity position is modified


```solidity
event ModifyLiquidity(
    PoolId indexed id, address indexed sender, int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt
);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`PoolId`|The abi encoded hash of the pool key struct for the pool that was modified|
|`sender`|`address`|The address that modified the pool|
|`tickLower`|`int24`|The lower tick of the position|
|`tickUpper`|`int24`|The upper tick of the position|
|`liquidityDelta`|`int256`|The amount of liquidity that was added or removed|
|`salt`|`bytes32`|The value used to create a unique liquidity position|

### Swap
Emitted for swaps between currency0 and currency1


```solidity
event Swap(
    PoolId indexed id,
    address indexed sender,
    int128 amount0,
    int128 amount1,
    uint160 sqrtPriceX96,
    uint128 liquidity,
    int24 tick,
    uint24 fee,
    uint16 protocolFee
);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`PoolId`|The abi encoded hash of the pool key struct for the pool that was modified|
|`sender`|`address`|The address that initiated the swap call, and that received the callback|
|`amount0`|`int128`|The delta of the currency0 balance of the pool|
|`amount1`|`int128`|The delta of the currency1 balance of the pool|
|`sqrtPriceX96`|`uint160`|The sqrt(price) of the pool after the swap, as a Q64.96|
|`liquidity`|`uint128`|The liquidity of the pool after the swap|
|`tick`|`int24`|The log base 1.0001 of the price of the pool after the swap|
|`fee`|`uint24`|The fee collected upon every swap in the pool (including protocol fee and LP fee), denominated in hundredths of a bip|
|`protocolFee`|`uint16`|Single direction protocol fee from the swap, also denominated in hundredths of a bip|

### Donate
Emitted when donate happen


```solidity
event Donate(PoolId indexed id, address indexed sender, uint256 amount0, uint256 amount1, int24 tick);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`PoolId`|The abi encoded hash of the pool key struct for the pool that was modified|
|`sender`|`address`|The address that modified the pool|
|`amount0`|`uint256`|The delta of the currency0 balance of the pool|
|`amount1`|`uint256`|The delta of the currency1 balance of the pool|
|`tick`|`int24`|The donated tick|

## Errors
### PoolManagerMismatch
PoolManagerMismatch is thrown when pool manager specified in the pool key does not match current contract


```solidity
error PoolManagerMismatch();
```

### TickSpacingTooLarge
Pools are limited to type(int16).max tickSpacing in #initialize, to prevent overflow


```solidity
error TickSpacingTooLarge(int24 tickSpacing);
```

### TickSpacingTooSmall
Pools must have a positive non-zero tickSpacing passed to #initialize


```solidity
error TickSpacingTooSmall(int24 tickSpacing);
```

### PoolPaused
Error thrown when add liquidity is called when paused()


```solidity
error PoolPaused();
```

### SwapAmountCannotBeZero
Thrown when trying to swap amount of 0


```solidity
error SwapAmountCannotBeZero();
```

## Structs
### ModifyLiquidityParams

```solidity
struct ModifyLiquidityParams {
    // the lower and upper tick of the position
    int24 tickLower;
    int24 tickUpper;
    // how to modify the liquidity
    int256 liquidityDelta;
    // a value to set if you want unique liquidity positions at the same range
    bytes32 salt;
}
```

### SwapParams

```solidity
struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified;
    uint160 sqrtPriceLimitX96;
}
```

