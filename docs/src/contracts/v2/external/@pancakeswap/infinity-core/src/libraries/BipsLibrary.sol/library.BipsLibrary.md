# BipsLibrary
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/libraries/BipsLibrary.sol)

**Title:**
For calculating a percentage of an amount, using bips


## State Variables
### BPS_DENOMINATOR

```solidity
uint256 internal constant BPS_DENOMINATOR = 10_000
```


## Functions
### calculatePortion


```solidity
function calculatePortion(uint256 amount, uint256 bips) internal pure returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`amount`|`uint256`|The total amount to calculate a percentage of|
|`bips`|`uint256`|The percentage to calculate, in bips|


## Errors
### InvalidBips
emitted when an invalid percentage is provided


```solidity
error InvalidBips();
```

