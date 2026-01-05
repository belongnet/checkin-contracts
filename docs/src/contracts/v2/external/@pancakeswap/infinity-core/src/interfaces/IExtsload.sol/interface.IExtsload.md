# IExtsload
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IExtsload.sol)


## Functions
### extsload

Called by external contracts to access granular pool state


```solidity
function extsload(bytes32 slot) external view returns (bytes32 value);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`slot`|`bytes32`|Key of slot to sload|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`value`|`bytes32`|The value of the slot as bytes32|


### extsload

Called by external contracts to access sparse pool state


```solidity
function extsload(bytes32[] calldata slots) external view returns (bytes32[] memory values);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`slots`|`bytes32[]`|List of slots to SLOAD from.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`values`|`bytes32[]`|List of loaded values.|


