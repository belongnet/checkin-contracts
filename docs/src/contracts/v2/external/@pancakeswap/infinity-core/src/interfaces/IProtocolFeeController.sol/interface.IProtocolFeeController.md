# IProtocolFeeController
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IProtocolFeeController.sol)


## Functions
### protocolFeeForPool

Get the protocol fee for a pool given the conditions of this contract


```solidity
function protocolFeeForPool(PoolKey memory poolKey) external view returns (uint24 protocolFee);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`poolKey`|`PoolKey`|The pool key to identify the pool. The controller may want to use attributes on the pool to determine the protocol fee, hence the entire key is needed.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`protocolFee`|`uint24`|The pool's protocol fee, expressed in hundredths of a bip. The upper 12 bits are for 1->0 and the lower 12 are for 0->1. The maximum is 4000 - meaning the maximum protocol fee is 0.4%. the protocolFee is taken from the input first, then the lpFee is taken from the remaining input|


