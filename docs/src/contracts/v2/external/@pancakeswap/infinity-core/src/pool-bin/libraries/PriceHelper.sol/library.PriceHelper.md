# PriceHelper
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/pool-bin/libraries/PriceHelper.sol)

This library contains functions to calculate prices


## State Variables
### REAL_ID_SHIFT

```solidity
int256 private constant REAL_ID_SHIFT = 1 << 23
```


## Functions
### getPriceFromId

Calculates the price from the id and the bin step


```solidity
function getPriceFromId(uint24 id, uint16 binStep) internal pure returns (uint256 price);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`uint24`|The id|
|`binStep`|`uint16`|The bin step|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`price`|`uint256`|The price as a 128.128-binary fixed-point number|


### getIdFromPrice

Calculates the id from the price and the bin step


```solidity
function getIdFromPrice(uint256 price, uint16 binStep) internal pure returns (uint24 id);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`price`|`uint256`|The price as a 128.128-binary fixed-point number|
|`binStep`|`uint16`|The bin step|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`id`|`uint24`|The id|


### getBase

Calculates the base from the bin step, which is `1 + binStep / BASIS_POINT_MAX`


```solidity
function getBase(uint16 binStep) internal pure returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`binStep`|`uint16`|The bin step|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|base The base|


### getExponent

Calculates the exponent from the id, which is `id - REAL_ID_SHIFT`


```solidity
function getExponent(uint24 id) internal pure returns (int256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`uint24`|The id|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`int256`|exponent The exponent|


### convertDecimalPriceTo128x128

Converts a price with 18 decimals to a 128.128-binary fixed-point number


```solidity
function convertDecimalPriceTo128x128(uint256 price) internal pure returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`price`|`uint256`|The price with 18 decimals|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|price128x128 The 128.128-binary fixed-point number|


### convert128x128PriceToDecimal

Converts a 128.128-binary fixed-point number to a price with 18 decimals


```solidity
function convert128x128PriceToDecimal(uint256 price128x128) internal pure returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`price128x128`|`uint256`|The 128.128-binary fixed-point number|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|price The price with 18 decimals|


