# Tick
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-cl/libraries/Tick.sol)

**Title:**
Tick

Contains functions for managing tick processes and relevant calculations


## Functions
### checkTicks

Common checks for valid tick inputs.


```solidity
function checkTicks(int24 tickLower, int24 tickUpper) internal pure;
```

### tickSpacingToMaxLiquidityPerTick

Derives max liquidity per tick from given tick spacing

Executed within the pool constructor


```solidity
function tickSpacingToMaxLiquidityPerTick(int24 tickSpacing) internal pure returns (uint128 result);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tickSpacing`|`int24`|The amount of required tick separation, realized in multiples of `tickSpacing` e.g., a tickSpacing of 3 requires ticks to be initialized every 3rd tick i.e., ..., -6, -3, 0, 3, 6, ...|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`result`|`uint128`|The max liquidity per tick|


### getFeeGrowthInside

Retrieves fee growth data


```solidity
function getFeeGrowthInside(
    mapping(int24 => Tick.Info) storage self,
    int24 tickLower,
    int24 tickUpper,
    int24 tickCurrent,
    uint256 feeGrowthGlobal0X128,
    uint256 feeGrowthGlobal1X128
) internal view returns (uint256 feeGrowthInside0X128, uint256 feeGrowthInside1X128);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`mapping(int24 => Tick.Info)`|The mapping containing all tick information for initialized ticks|
|`tickLower`|`int24`|The lower tick boundary of the position|
|`tickUpper`|`int24`|The upper tick boundary of the position|
|`tickCurrent`|`int24`|The current tick|
|`feeGrowthGlobal0X128`|`uint256`|The all-time global fee growth, per unit of liquidity, in token0|
|`feeGrowthGlobal1X128`|`uint256`|The all-time global fee growth, per unit of liquidity, in token1|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`feeGrowthInside0X128`|`uint256`|The all-time fee growth in token0, per unit of liquidity, inside the position's tick boundaries|
|`feeGrowthInside1X128`|`uint256`|The all-time fee growth in token1, per unit of liquidity, inside the position's tick boundaries|


### update

Updates a tick and returns true if the tick was flipped from initialized to uninitialized, or vice versa


```solidity
function update(
    mapping(int24 => Tick.Info) storage self,
    int24 tick,
    int24 tickCurrent,
    int128 liquidityDelta,
    uint256 feeGrowthGlobal0X128,
    uint256 feeGrowthGlobal1X128,
    bool upper,
    uint128 maxLiquidity
) internal returns (bool flipped);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`mapping(int24 => Tick.Info)`|The mapping containing all tick information for initialized ticks|
|`tick`|`int24`|The tick that will be updated|
|`tickCurrent`|`int24`|The current tick|
|`liquidityDelta`|`int128`|A new amount of liquidity to be added (subtracted) when tick is crossed from left to right (right to left)|
|`feeGrowthGlobal0X128`|`uint256`|The all-time global fee growth, per unit of liquidity, in token0|
|`feeGrowthGlobal1X128`|`uint256`|The all-time global fee growth, per unit of liquidity, in token1|
|`upper`|`bool`|true for updating a position's upper tick, or false for updating a position's lower tick|
|`maxLiquidity`|`uint128`|The maximum liquidity allocation for a single tick|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`flipped`|`bool`|Whether the tick was flipped from initialized to uninitialized, or vice versa|


### clear

Clears tick data


```solidity
function clear(mapping(int24 => Tick.Info) storage self, int24 tick) internal;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`mapping(int24 => Tick.Info)`|The mapping containing all initialized tick information for initialized ticks|
|`tick`|`int24`|The tick that will be cleared|


### cross

Transitions to next tick as needed by price movement


```solidity
function cross(
    mapping(int24 => Tick.Info) storage self,
    int24 tick,
    uint256 feeGrowthGlobal0X128,
    uint256 feeGrowthGlobal1X128
) internal returns (int128 liquidityNet);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`mapping(int24 => Tick.Info)`|The mapping containing all tick information for initialized ticks|
|`tick`|`int24`|The destination tick of the transition|
|`feeGrowthGlobal0X128`|`uint256`|The all-time global fee growth, per unit of liquidity, in token0|
|`feeGrowthGlobal1X128`|`uint256`|The all-time global fee growth, per unit of liquidity, in token1|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`liquidityNet`|`int128`|The amount of liquidity added (subtracted) when tick is crossed from left to right (right to left)|


## Errors
### TicksMisordered
Thrown when tickLower is not below tickUpper


```solidity
error TicksMisordered(int24 tickLower, int24 tickUpper);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tickLower`|`int24`|The invalid tickLower|
|`tickUpper`|`int24`|The invalid tickUpper|

### TickLowerOutOfBounds
Thrown when tickLower is less than min tick


```solidity
error TickLowerOutOfBounds(int24 tickLower);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tickLower`|`int24`|The invalid tickLower|

### TickUpperOutOfBounds
Thrown when tickUpper exceeds max tick


```solidity
error TickUpperOutOfBounds(int24 tickUpper);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tickUpper`|`int24`|The invalid tickUpper|

### TickLiquidityOverflow
For the tick spacing, the tick has too much liquidity


```solidity
error TickLiquidityOverflow(int24 tick);
```

## Structs
### Info

```solidity
struct Info {
    // the total position liquidity that references this tick
    uint128 liquidityGross;
    // amount of net liquidity added (subtracted) when tick is crossed from left to right (right to left),
    int128 liquidityNet;
    // fee growth per unit of liquidity on the _other_ side of this tick (relative to the current tick)
    // only has relative meaning, not absolute — the value depends on when the tick is initialized
    uint256 feeGrowthOutside0X128;
    uint256 feeGrowthOutside1X128;
}
```

