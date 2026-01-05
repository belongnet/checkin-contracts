# FeeHelper
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-bin/libraries/FeeHelper.sol)

Helper to calculate fees for BinPool


## Functions
### getFeeAmountFrom

Calculates the fee amount from the amount with fees, rounding up


```solidity
function getFeeAmountFrom(uint128 amountWithFees, uint24 feeBips) internal pure returns (uint128);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`amountWithFees`|`uint128`|The amount with fees|
|`feeBips`|`uint24`|feeBips - 100 = 0.01%, 1_000 = 0.1%, 100_000 = 10% (max)|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint128`|feeAmount The fee amount|


### getFeeAmount

Calculates the fee amount that will be charged, rounding up


```solidity
function getFeeAmount(uint128 amount, uint24 feeBips) internal pure returns (uint128);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`amount`|`uint128`|The amount|
|`feeBips`|`uint24`|feeBips - 100 = 0.01%, 1_000 = 0.1%, 100_000 = 10% (max)|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint128`|feeAmount The fee amount|


### getCompositionFee

Calculates the composition fee amount from the amount with fees, rounding down

Composition fee is higher than swapFee to ensure user do not does an implicit swap through mint to take advantage of lower fees


```solidity
function getCompositionFee(uint128 amountWithFees, uint24 feeBips) internal pure returns (uint128);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`amountWithFees`|`uint128`|The amount with fees|
|`feeBips`|`uint24`|The total fee, 100 = 0.01%, 10_000 = 1%, 100_000 = 10% (max)|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint128`|The amount with fees|


