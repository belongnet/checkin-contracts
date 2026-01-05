# TreeMath
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/pool-bin/libraries/math/TreeMath.sol)

This library contains functions to interact with a tree of TreeUint24.


## Functions
### contains

Returns true if the tree contains the id


```solidity
function contains(mapping(bytes32 => bytes32) storage level2, uint24 id) internal view returns (bool);
```

### add

Adds the id to the tree and returns true if the id was not already in the tree
It will also propagate the change to the parent levels.


```solidity
function add(
    bytes32 level0,
    mapping(bytes32 => bytes32) storage level1,
    mapping(bytes32 => bytes32) storage level2,
    uint24 id
) internal returns (bool, bytes32);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|True if the id was not already in the tree|
|`<none>`|`bytes32`||


### remove

Removes the id from the tree and returns true if the id was in the tree.
It will also propagate the change to the parent levels.


```solidity
function remove(
    bytes32 level0,
    mapping(bytes32 => bytes32) storage level1,
    mapping(bytes32 => bytes32) storage level2,
    uint24 id
) internal returns (bool, bytes32);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`level0`|`bytes32`||
|`level1`|`mapping(bytes32 => bytes32)`||
|`level2`|`mapping(bytes32 => bytes32)`||
|`id`|`uint24`|The id|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|True if the id was in the tree|
|`<none>`|`bytes32`||


### findFirstRight

Returns the first id in the tree that is lower than or equal to the given id.
It will return type(uint24).max if there is no such id.


```solidity
function findFirstRight(
    bytes32 level0,
    mapping(bytes32 => bytes32) storage level1,
    mapping(bytes32 => bytes32) storage level2,
    uint24 id
) internal view returns (uint24);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint24`|The first id in the tree that is lower than or equal to the given id|


### findFirstLeft

Returns the first id in the tree that is higher than or equal to the given id.
It will return 0 if there is no such id.


```solidity
function findFirstLeft(
    bytes32 level0,
    mapping(bytes32 => bytes32) storage level1,
    mapping(bytes32 => bytes32) storage level2,
    uint24 id
) internal view returns (uint24);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint24`|The first id in the tree that is higher than or equal to the given id|


### _closestBitRight

Returns the first bit in the given leaves that is strictly lower than the given bit.
It will return type(uint256).max if there is no such bit.


```solidity
function _closestBitRight(bytes32 leaves, uint8 bit) private pure returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`leaves`|`bytes32`|The leaves|
|`bit`|`uint8`|The bit|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The first bit in the given leaves that is strictly lower than the given bit|


### _closestBitLeft

Returns the first bit in the given leaves that is strictly higher than the given bit.
It will return type(uint256).max if there is no such bit.


```solidity
function _closestBitLeft(bytes32 leaves, uint8 bit) private pure returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`leaves`|`bytes32`|The leaves|
|`bit`|`uint8`|The bit|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The first bit in the given leaves that is strictly higher than the given bit|


