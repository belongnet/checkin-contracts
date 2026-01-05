# UnsafeMath
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/libraries/math/UnsafeMath.sol)

**Title:**
Math functions that do not check inputs or outputs

Contains methods that perform common math functions but do not do any overflow or underflow checks


## Functions
### divRoundingUp

Returns ceil(x / y)

division by 0 will return 0, and should be checked externally


```solidity
function divRoundingUp(uint256 x, uint256 y) internal pure returns (uint256 z);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`x`|`uint256`|The dividend|
|`y`|`uint256`|The divisor|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`z`|`uint256`|The quotient, ceil(x / y)|


### simpleMulDiv

Calculates floor(a×b÷denominator)

division by 0 will return 0, and should be checked externally


```solidity
function simpleMulDiv(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256 result);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`a`|`uint256`|The multiplicand|
|`b`|`uint256`|The multiplier|
|`denominator`|`uint256`|The divisor|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`result`|`uint256`|The 256-bit result, floor(a×b÷denominator)|


