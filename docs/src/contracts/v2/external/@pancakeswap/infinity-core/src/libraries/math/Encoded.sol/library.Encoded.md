# Encoded
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/libraries/math/Encoded.sol)

Helper contract used for decoding bytes32


## State Variables
### MASK_UINT1

```solidity
uint256 internal constant MASK_UINT1 = 0x1
```


### MASK_UINT16

```solidity
uint256 internal constant MASK_UINT16 = 0xffff
```


### MASK_UINT24

```solidity
uint256 internal constant MASK_UINT24 = 0xffffff
```


### MASK_UINT64

```solidity
uint256 internal constant MASK_UINT64 = 0xffffffffffffffff
```


## Functions
### set

Internal function to set a value in an encoded bytes32 using a mask and offset

This function can overflow


```solidity
function set(bytes32 encoded, uint256 value, uint256 mask, uint256 offset)
    internal
    pure
    returns (bytes32 newEncoded);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`encoded`|`bytes32`|The previous encoded value|
|`value`|`uint256`|The value to encode|
|`mask`|`uint256`|The mask|
|`offset`|`uint256`|The offset|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`newEncoded`|`bytes32`|The new encoded value|


### setBool

Internal function to set a bool in an encoded bytes32 using an offset

This function can overflow


```solidity
function setBool(bytes32 encoded, bool boolean, uint256 offset) internal pure returns (bytes32 newEncoded);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`encoded`|`bytes32`|The previous encoded value|
|`boolean`|`bool`|The bool to encode|
|`offset`|`uint256`|The offset|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`newEncoded`|`bytes32`|The new encoded value|


### decode

Internal function to decode a bytes32 sample using a mask and offset

This function can overflow


```solidity
function decode(bytes32 encoded, uint256 mask, uint256 offset) internal pure returns (uint256 value);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`encoded`|`bytes32`|The encoded value|
|`mask`|`uint256`|The mask|
|`offset`|`uint256`|The offset|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`value`|`uint256`|The decoded value|


### decodeBool

Internal function to decode a bytes32 sample into a bool using an offset

This function can overflow


```solidity
function decodeBool(bytes32 encoded, uint256 offset) internal pure returns (bool boolean);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`encoded`|`bytes32`|The encoded value|
|`offset`|`uint256`|The offset|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`boolean`|`bool`|The decoded value as a bool|


### decodeUint16

Internal function to decode a bytes32 sample into a uint16 using an offset

This function can overflow


```solidity
function decodeUint16(bytes32 encoded, uint256 offset) internal pure returns (uint16 value);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`encoded`|`bytes32`|The encoded value|
|`offset`|`uint256`|The offset|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`value`|`uint16`|The decoded value|


### decodeUint24

Internal function to decode a bytes32 sample into a uint24 using an offset

This function can overflow


```solidity
function decodeUint24(bytes32 encoded, uint256 offset) internal pure returns (uint24 value);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`encoded`|`bytes32`|The encoded value|
|`offset`|`uint256`|The offset|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`value`|`uint24`|The decoded value|


### decodeUint64

Internal function to decode a bytes32 sample into a uint64 using an offset

This function can overflow


```solidity
function decodeUint64(bytes32 encoded, uint256 offset) internal pure returns (uint64 value);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`encoded`|`bytes32`|The encoded value|
|`offset`|`uint256`|The offset|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`value`|`uint64`|The decoded value|


