# BinPosition
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-bin/libraries/BinPosition.sol)

**Title:**
BinPosition

Positions represent an owner address' share for a bin


## Functions
### calculatePositionKey

A helper function to calculate the position key


```solidity
function calculatePositionKey(address owner, uint24 binId, bytes32 salt) internal pure returns (bytes32 key);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`owner`|`address`|The address of the position owner|
|`binId`|`uint24`|The bin id where the position's liquidity is added|
|`salt`|`bytes32`|A unique value to differentiate between multiple positions in the same binId, by the same owner. Passed in by the caller.|


### get

Returns the Info struct of a position, given an owner and position boundaries


```solidity
function get(mapping(bytes32 => Info) storage self, address owner, uint24 binId, bytes32 salt)
    internal
    view
    returns (BinPosition.Info storage position);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`mapping(bytes32 => Info)`|The mapping containing all user positions|
|`owner`|`address`|The address of the position owner|
|`binId`|`uint24`|The bin id where the position's liquidity is added|
|`salt`|`bytes32`|The salt to distinguish different positions for the same owner|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`position`|`BinPosition.Info`|The position info struct of the given owners' position|


### addShare


```solidity
function addShare(Info storage self, uint256 share) internal;
```

### subShare


```solidity
function subShare(Info storage self, uint256 share) internal;
```

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
    // the amount of share owned by this position
    uint256 share;
}
```

