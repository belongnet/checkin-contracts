# LPFeeLibrary
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/libraries/LPFeeLibrary.sol)

Library for handling lp fee setting from `PoolKey.fee`
It can be either static or dynamic, and upper 4 bits are used to store the flag:
1. if the flag is set, then the fee is dynamic, it can be set and updated by hook
2. otherwise if the flag is not set, then the fee is static, and the lower 20 bits are used to store the fee


## State Variables
### OVERRIDE_MASK
mask to remove the override fee flag from a fee returned by the beforeSwaphook


```solidity
uint24 public constant OVERRIDE_MASK = 0xBFFFFF
```


### DYNAMIC_FEE_FLAG
a dynamic fee pool must have exactly same value for fee field


```solidity
uint24 public constant DYNAMIC_FEE_FLAG = 0x800000
```


### OVERRIDE_FEE_FLAG
the second bit of the fee returned by beforeSwap is used to signal if the stored LP fee should be overridden in this swap


```solidity
uint24 public constant OVERRIDE_FEE_FLAG = 0x400000
```


### ONE_HUNDRED_PERCENT_FEE
the fee is represented in hundredths of a bip
max fee varies between different pool types i.e. it's 100% for cl pool and 10% for bin pool


```solidity
uint24 public constant ONE_HUNDRED_PERCENT_FEE = 1_000_000
```


### TEN_PERCENT_FEE

```solidity
uint24 public constant TEN_PERCENT_FEE = 100_000
```


## Functions
### isDynamicLPFee

returns true if a pool's LP fee signals that the pool has a dynamic fee


```solidity
function isDynamicLPFee(uint24 self) internal pure returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`uint24`|The fee to check|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|bool True of the fee is dynamic|


### validate

validates whether an LP fee is larger than the maximum, and reverts if invalid


```solidity
function validate(uint24 self, uint24 maxFee) internal pure;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`uint24`|The fee to validate|
|`maxFee`|`uint24`|The maximum fee allowed for the pool|


### getInitialLPFee

gets the initial LP fee for a pool. Dynamic fee pools have an initial fee of 0.

if a dynamic fee pool wants a non-0 initial fee, it should call `updateDynamicLPFee` in the afterInitialize hook


```solidity
function getInitialLPFee(uint24 self) internal pure returns (uint24 initialFee);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`uint24`|The fee to get the initial LP from|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`initialFee`|`uint24`|0 if the fee is dynamic, otherwise the original value|


### isOverride

returns true if the fee has the override flag set (2nd highest bit of the uint24)


```solidity
function isOverride(uint24 self) internal pure returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`uint24`|The fee to check|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|bool True of the fee has the override flag set|


### removeOverrideFlag

returns a fee with the override flag removed


```solidity
function removeOverrideFlag(uint24 self) internal pure returns (uint24);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`uint24`|The fee to remove the override flag from|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint24`|fee The fee without the override flag set|


### removeOverrideAndValidate

Removes the override flag and validates the fee (reverts if the fee is too large)


```solidity
function removeOverrideAndValidate(uint24 self, uint24 maxFee) internal pure returns (uint24);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`uint24`|The fee to remove the override flag from, and then validate|
|`maxFee`|`uint24`|The maximum fee allowed for the pool|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint24`|fee The fee without the override flag set (if valid)|


## Errors
### LPFeeTooLarge
Thrown when the static/dynamic fee on a pool exceeds 100%.


```solidity
error LPFeeTooLarge(uint24 fee);
```

