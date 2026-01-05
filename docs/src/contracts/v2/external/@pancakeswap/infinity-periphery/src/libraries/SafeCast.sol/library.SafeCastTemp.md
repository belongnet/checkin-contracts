# SafeCastTemp
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/libraries/SafeCast.sol)

**Title:**
Safe casting methods

Contains methods for safely casting between types
TODO after audits move this function to core's SafeCast.sol!


## Functions
### toUint128

Cast a uint256 to a uint128, revert on overflow


```solidity
function toUint128(uint256 x) internal pure returns (uint128 y);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`x`|`uint256`|The uint256 to be downcasted|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`y`|`uint128`|The downcasted integer, now type uint128|


### toUint128

Cast a int128 to a uint128, revert on overflow or underflow


```solidity
function toUint128(int128 x) internal pure returns (uint128 y);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`x`|`int128`|The int128 to be casted|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`y`|`uint128`|The casted integer, now type uint128|


### toInt128

Cast a uint256 to a int128, revert on overflow


```solidity
function toInt128(uint256 x) internal pure returns (int128);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`x`|`uint256`|The uint256 to be downcasted|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`int128`|The downcasted integer, now type int128|


## Errors
### SafeCastOverflow

```solidity
error SafeCastOverflow();
```

