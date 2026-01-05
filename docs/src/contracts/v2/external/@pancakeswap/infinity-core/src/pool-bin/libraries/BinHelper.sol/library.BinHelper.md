# BinHelper
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-bin/libraries/BinHelper.sol)

This library contains functions to help interaction with bins.


## Functions
### getAmountOutOfBin

Returns the amount of tokens that will be received when burning the given amount of liquidity


```solidity
function getAmountOutOfBin(bytes32 binReserves, uint256 amountToBurn, uint256 totalSupply)
    internal
    pure
    returns (bytes32 amountsOut);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`binReserves`|`bytes32`|The reserves of the bin|
|`amountToBurn`|`uint256`|The amount of liquidity to burn|
|`totalSupply`|`uint256`|The total supply of the liquidity book|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountsOut`|`bytes32`|The encoded amount of tokens that will be received|


### getSharesAndEffectiveAmountsIn

Returns the share and the effective amounts in when adding liquidity


```solidity
function getSharesAndEffectiveAmountsIn(bytes32 binReserves, bytes32 amountsIn, uint256 price, uint256 totalSupply)
    internal
    pure
    returns (uint256 shares, bytes32 effectiveAmountsIn);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`binReserves`|`bytes32`|The reserves of the bin|
|`amountsIn`|`bytes32`|The amounts of tokens to add|
|`price`|`uint256`|The price of the bin|
|`totalSupply`|`uint256`|The total supply of the liquidity book|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`shares`|`uint256`|The share of the liquidity book that the user will receive|
|`effectiveAmountsIn`|`bytes32`|The encoded effective amounts of tokens that the user will add. This is the amount of tokens that the user will actually add to the liquidity book, and will always be less than or equal to the amountsIn.|


### getLiquidity

Returns the amount of liquidity following the constant sum formula `L = price * x + y`


```solidity
function getLiquidity(bytes32 amounts, uint256 price) internal pure returns (uint256 liquidity);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`amounts`|`bytes32`|The amounts of tokens|
|`price`|`uint256`|The price of the bin|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`liquidity`|`uint256`|The amount of liquidity|


### getLiquidity

Returns the amount of liquidity following the constant sum formula `L = price * x + y`


```solidity
function getLiquidity(uint256 x, uint256 y, uint256 price) internal pure returns (uint256 liquidity);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`x`|`uint256`|The amount of the token X|
|`y`|`uint256`|The amount of the token Y|
|`price`|`uint256`|The price of the bin|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`liquidity`|`uint256`|The amount of liquidity|


### verifyAmounts

Verify that the amounts are correct and that the composition factor is not flawed


```solidity
function verifyAmounts(bytes32 amounts, uint24 activeId, uint24 id) internal pure;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`amounts`|`bytes32`|The amounts of tokens|
|`activeId`|`uint24`|The id of the active bin|
|`id`|`uint24`|The id of the bin|


### getCompositionFeesAmount

Returns the composition fees when adding liquidity to the active bin with a different
composition factor than the bin's one, as it does an implicit swap


```solidity
function getCompositionFeesAmount(
    bytes32 binReserves,
    uint24 protocolFee, // fee: 100 = 0.01%
    uint24 lpFee,
    bytes32 amountsIn,
    uint256 totalSupply,
    uint256 shares
) internal pure returns (bytes32 feesAmount, bytes32 feeAmountToProtocol);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`binReserves`|`bytes32`|The reserves of the bin|
|`protocolFee`|`uint24`|100 = 0.01%, 1000 = 0.1%|
|`lpFee`|`uint24`|100 = 0.01%, 1000 = 0.1%|
|`amountsIn`|`bytes32`|The amounts of tokens to add|
|`totalSupply`|`uint256`|The total supply of the liquidity book|
|`shares`|`uint256`|The share of the liquidity book that the user will receive|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`feesAmount`|`bytes32`|The encoded fees that will be charged (including protocol and LP fee)|
|`feeAmountToProtocol`|`bytes32`|The encoded protocol fee that will be charged|


### isEmpty

Returns whether the bin is empty (true) or not (false)


```solidity
function isEmpty(bytes32 binReserves, bool isX) internal pure returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`binReserves`|`bytes32`|The reserves of the bin|
|`isX`|`bool`|Whether the reserve to check is the X reserve (true) or the Y reserve (false)|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|Whether the bin is empty (true) or not (false)|


### getAmountsIn

Returns the amounts of tokens that will be added and removed from the bin during a exactOut swap
along with the fees that will be charged


```solidity
function getAmountsIn(
    bytes32 binReserves,
    uint24 fee,
    uint16 binStep,
    bool swapForY,
    uint24 activeId,
    bytes32 amountsOutLeft
) internal pure returns (bytes32 amountsInWithFees, bytes32 amountsOutOfBin, bytes32 totalFees);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`binReserves`|`bytes32`|The reserves of the bin|
|`fee`|`uint24`|100 = 0.01%, 1_000 = 0.1%|
|`binStep`|`uint16`|The step of the bin|
|`swapForY`|`bool`|Whether the swap is for Y (true) or for X (false)|
|`activeId`|`uint24`|The id of the active bin|
|`amountsOutLeft`|`bytes32`|The amounts of tokens out left|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountsInWithFees`|`bytes32`|The encoded amounts of tokens that will be added to the bin, including fees|
|`amountsOutOfBin`|`bytes32`|The encoded amounts of tokens that will be removed from the bin|
|`totalFees`|`bytes32`|The encoded fees that will be charged|


### getAmountsOut

Returns the amounts of tokens that will be added and removed from the bin during a exactIn swap
along with the fees that will be charged


```solidity
function getAmountsOut(
    bytes32 binReserves,
    uint24 fee,
    uint16 binStep,
    bool swapForY, // swap `swapForY` and `activeId` to avoid stack too deep
    uint24 activeId,
    bytes32 amountsInLeft
) internal pure returns (bytes32 amountsInWithFees, bytes32 amountsOutOfBin, bytes32 totalFees);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`binReserves`|`bytes32`|The reserves of the bin|
|`fee`|`uint24`|100 = 0.01%, 1_000 = 0.1%|
|`binStep`|`uint16`|The step of the bin|
|`swapForY`|`bool`|Whether the swap is for Y (true) or for X (false)|
|`activeId`|`uint24`|The id of the active bin|
|`amountsInLeft`|`bytes32`|The amounts of tokens left to swap|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountsInWithFees`|`bytes32`|The encoded amounts of tokens that will be added to the bin, including fees|
|`amountsOutOfBin`|`bytes32`|The encoded amounts of tokens that will be removed from the bin|
|`totalFees`|`bytes32`|The encoded fees that will be charged|


## Errors
### BinHelper__CompositionFactorFlawed

```solidity
error BinHelper__CompositionFactorFlawed(uint24 id);
```

### BinHelper__LiquidityOverflow

```solidity
error BinHelper__LiquidityOverflow();
```

