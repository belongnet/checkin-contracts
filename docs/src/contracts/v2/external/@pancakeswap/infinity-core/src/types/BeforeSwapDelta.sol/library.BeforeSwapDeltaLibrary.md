# BeforeSwapDeltaLibrary
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/types/BeforeSwapDelta.sol)

Library for getting the specified and unspecified deltas from the BeforeSwapDelta type


## State Variables
### ZERO_DELTA
Constant for a BeforeSwapDelta of zero value


```solidity
BeforeSwapDelta public constant ZERO_DELTA = BeforeSwapDelta.wrap(0)
```


## Functions
### getSpecifiedDelta

extracts int128 from the upper 128 bits of the BeforeSwapDelta


```solidity
function getSpecifiedDelta(BeforeSwapDelta delta) internal pure returns (int128 deltaSpecified);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`delta`|`BeforeSwapDelta`|The BeforeSwapDelta returned by beforeSwap|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`deltaSpecified`|`int128`|The delta in specified tokens|


### getUnspecifiedDelta

extracts int128 from the lower 128 bits of the BeforeSwapDelta


```solidity
function getUnspecifiedDelta(BeforeSwapDelta delta) internal pure returns (int128 deltaUnspecified);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`delta`|`BeforeSwapDelta`|The BeforeSwapDelta returned by beforeSwap|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`deltaUnspecified`|`int128`|The delta in unspecified tokens|


