# Uint128x128Math
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-bin/libraries/math/Uint128x128Math.sol)

Helper contract used for power and log calculations


## State Variables
### LOG_SCALE_OFFSET

```solidity
uint256 internal constant LOG_SCALE_OFFSET = 127
```


### LOG_SCALE

```solidity
uint256 internal constant LOG_SCALE = 1 << LOG_SCALE_OFFSET
```


### LOG_SCALE_SQUARED

```solidity
uint256 internal constant LOG_SCALE_SQUARED = LOG_SCALE * LOG_SCALE
```


## Functions
### log2

Calculates the binary logarithm of x.

Based on the iterative approximation algorithm.
https://en.wikipedia.org/wiki/Binary_logarithm#Iterative_approximation
Requirements:
- x must be greater than zero.
Caveats:
- The results are not perfectly accurate to the last decimal, due to the lossy precision of the iterative approximation
Also because x is converted to an unsigned 129.127-binary fixed-point number during the operation to optimize the multiplication


```solidity
function log2(uint256 x) internal pure returns (int256 result);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`x`|`uint256`|The unsigned 128.128-binary fixed-point number for which to calculate the binary logarithm.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`result`|`int256`|The binary logarithm as a signed 128.128-binary fixed-point number.|


### pow

Returns the value of x^y. It calculates `1 / x^abs(y)` if x is bigger than 2^128.
At the end of the operations, we invert the result if needed.


```solidity
function pow(uint256 x, int256 y) internal pure returns (uint256 result);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`x`|`uint256`|The unsigned 128.128-binary fixed-point number for which to calculate the power|
|`y`|`int256`|A relative number without any decimals, needs to be between ]2^21; 2^21[|


## Errors
### Uint128x128Math__LogUnderflow

```solidity
error Uint128x128Math__LogUnderflow();
```

### Uint128x128Math__PowUnderflow

```solidity
error Uint128x128Math__PowUnderflow(uint256 x, int256 y);
```

