# ProtocolFeeLibrary
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/libraries/ProtocolFeeLibrary.sol)


## State Variables
### MAX_PROTOCOL_FEE
Max protocol fee is 0.4% (4000 pips)

Increasing these values could lead to overflow in Pool.swap


```solidity
uint16 public constant MAX_PROTOCOL_FEE = 4000
```


### FEE_0_THRESHOLD
Thresholds used for optimized bounds checks on protocol fees


```solidity
uint24 internal constant FEE_0_THRESHOLD = 4001
```


### FEE_1_THRESHOLD

```solidity
uint24 internal constant FEE_1_THRESHOLD = 4001 << 12
```


### PIPS_DENOMINATOR
the protocol fee is represented in hundredths of a bip


```solidity
uint256 internal constant PIPS_DENOMINATOR = 1_000_000
```


## Functions
### getZeroForOneFee

Get the fee taken when swap token0 for token1


```solidity
function getZeroForOneFee(uint24 self) internal pure returns (uint16);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`uint24`|The composite protocol fee to get the single direction fee from|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint16`|The fee taken when swapping token0 for token1|


### getOneForZeroFee

Get the fee taken when swap token1 for token0


```solidity
function getOneForZeroFee(uint24 self) internal pure returns (uint16);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`uint24`|The composite protocol fee to get the single direction fee from|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint16`|The fee taken when swapping token1 for token0|


### validate

Validate that the protocol fee is within bounds


```solidity
function validate(uint24 self) internal pure returns (bool valid);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`uint24`|The composite protocol fee to validate|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`valid`|`bool`|True if the fee is within bounds|


### calculateSwapFee

The protocol fee is taken from the input amount first and then the LP fee is taken from the remaining
Also note the swap fee is capped at 1_000_000 (100%) for cl pool and 100_000 (10%) for bin pool


```solidity
function calculateSwapFee(uint16 self, uint24 lpFee) internal pure returns (uint24 swapFee);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`uint16`|The single direction protocol fee to calculate the swap fee from|
|`lpFee`|`uint24`|The LP fee to calculate the swap fee from|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`swapFee`|`uint24`|The composite swap fee|


