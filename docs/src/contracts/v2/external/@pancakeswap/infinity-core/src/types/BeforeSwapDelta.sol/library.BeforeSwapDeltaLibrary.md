# BeforeSwapDeltaLibrary
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/types/BeforeSwapDelta.sol)

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


