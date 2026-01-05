# CLPosition
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/pool-cl/libraries/CLPosition.sol)

**Title:**
CLPosition

Positions represent an owner address' liquidity between a lower and upper tick boundary

Positions store additional state for tracking fees owed to the position


## Functions
### calculatePositionKey

A helper function to calculate the position key


```solidity
function calculatePositionKey(address owner, int24 tickLower, int24 tickUpper, bytes32 salt)
    internal
    pure
    returns (bytes32 key);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`owner`|`address`|The address of the position owner|
|`tickLower`|`int24`|the lower tick boundary of the position|
|`tickUpper`|`int24`|the upper tick boundary of the position|
|`salt`|`bytes32`|A unique value to differentiate between multiple positions in the same range, by the same owner. Passed in by the caller.|


### get

Returns the Info struct of a position, given an owner and position boundaries


```solidity
function get(mapping(bytes32 => Info) storage self, address owner, int24 tickLower, int24 tickUpper, bytes32 salt)
    internal
    view
    returns (Info storage position);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`mapping(bytes32 => Info)`|The mapping containing all user positions|
|`owner`|`address`|The address of the position owner|
|`tickLower`|`int24`|The lower tick boundary of the position|
|`tickUpper`|`int24`|The upper tick boundary of the position|
|`salt`|`bytes32`|A unique value to differentiate between multiple positions in the same range|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`position`|`Info`|The position info struct of the given owners' position|


### update

Credits accumulated fees to a user's position


```solidity
function update(
    Info storage self,
    int128 liquidityDelta,
    uint256 feeGrowthInside0X128,
    uint256 feeGrowthInside1X128
) internal returns (uint256 feesOwed0, uint256 feesOwed1);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`Info`|The individual position to update|
|`liquidityDelta`|`int128`|The change in pool liquidity as a result of the position update|
|`feeGrowthInside0X128`|`uint256`|The all-time fee growth in currency0, per unit of liquidity, inside the position's tick boundaries|
|`feeGrowthInside1X128`|`uint256`|The all-time fee growth in currency1, per unit of liquidity, inside the position's tick boundaries|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`feesOwed0`|`uint256`|The amount of currency0 owed to the position owner|
|`feesOwed1`|`uint256`|The amount of currency1 owed to the position owner|


## Errors
### CannotUpdateEmptyPosition
Cannot update a position with no liquidity


```solidity
error CannotUpdateEmptyPosition();
```

## Structs
### Info

```solidity
struct Info {
    // the amount of liquidity owned by this position
    uint128 liquidity;
    // fee growth per unit of liquidity as of the last update to liquidity or fees owed
    uint256 feeGrowthInside0LastX128;
    uint256 feeGrowthInside1LastX128;
}
```

