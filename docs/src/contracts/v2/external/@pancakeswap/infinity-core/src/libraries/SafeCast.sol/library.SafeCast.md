# SafeCast
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/libraries/SafeCast.sol)

**Title:**
Safe casting methods

Contains methods for safely casting between types


## Functions
### _revertOverflow


```solidity
function _revertOverflow() private pure;
```

### toUint160

Cast a uint256 to a uint160, revert on overflow


```solidity
function toUint160(uint256 x) internal pure returns (uint160 y);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`x`|`uint256`|The uint256 to be downcasted|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`y`|`uint160`|The downcasted integer, now type uint160|


### toInt128

Cast a int256 to a int128, revert on overflow or underflow


```solidity
function toInt128(int256 x) internal pure returns (int128 y);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`x`|`int256`|The int256 to be downcasted|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`y`|`int128`|The downcasted integer, now type int128|


### toInt256

Cast a uint256 to a int256, revert on overflow


```solidity
function toInt256(uint256 x) internal pure returns (int256 y);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`x`|`uint256`|The uint256 to be casted|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`y`|`int256`|The casted integer, now type int256|


### toUint256

Cast a int256 to a uint256, revert on overflow


```solidity
function toUint256(int256 x) internal pure returns (uint256 y);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`x`|`int256`|The int256 to be casted|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`y`|`uint256`|The casted integer, now type uint256|


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

