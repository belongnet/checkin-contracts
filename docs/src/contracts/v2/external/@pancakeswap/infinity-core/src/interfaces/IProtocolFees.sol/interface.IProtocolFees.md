# IProtocolFees
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IProtocolFees.sol)


## Functions
### protocolFeesAccrued

Given a currency address, returns the protocol fees accrued in that currency


```solidity
function protocolFeesAccrued(Currency currency) external view returns (uint256 amount);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`currency`|`Currency`|The currency to check|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount`|`uint256`|The amount of protocol fees accrued in the given currency|


### protocolFeeController

Returns the current protocol fee controller address


```solidity
function protocolFeeController() external view returns (IProtocolFeeController);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`IProtocolFeeController`|IProtocolFeeController The currency protocol fee controller|


### setProtocolFee

Sets the protocol's swap fee for the given pool


```solidity
function setProtocolFee(PoolKey memory key, uint24 newProtocolFee) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`key`|`PoolKey`|The pool key for which to set the protocol fee|
|`newProtocolFee`|`uint24`|The new protocol fee to set|


### setProtocolFeeController

Update the protocol fee controller, called by the owner


```solidity
function setProtocolFeeController(IProtocolFeeController controller) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`controller`|`IProtocolFeeController`|The new protocol fee controller to be set|


### collectProtocolFees

Collects the protocol fee accrued in the given currency, called by the owner or the protocol fee controller

This will revert if vault is locked


```solidity
function collectProtocolFees(address recipient, Currency currency, uint256 amount)
    external
    returns (uint256 amountCollected);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`recipient`|`address`|The address to which the protocol fees should be sent|
|`currency`|`Currency`|The currency in which to collect the protocol fees|
|`amount`|`uint256`|The amount of protocol fees to collect|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountCollected`|`uint256`|The amount of protocol fees actually collected|


### vault

Returns the vault where the protocol fees are safely stored


```solidity
function vault() external view returns (IVault);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`IVault`|IVault The address of the vault|


## Events
### ProtocolFeeUpdated
Emitted when protocol fee is updated

The event is emitted even if the updated protocolFee is the same as previous protocolFee


```solidity
event ProtocolFeeUpdated(PoolId indexed id, uint24 protocolFee);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`PoolId`|The pool id for which the protocol fee is updated|
|`protocolFee`|`uint24`| The new protocol fee value|

### ProtocolFeeControllerUpdated
Emitted when protocol fee controller is updated


```solidity
event ProtocolFeeControllerUpdated(address indexed protocolFeeController);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`protocolFeeController`|`address`|The new protocol fee controller|

## Errors
### ProtocolFeeTooLarge
Thrown when the protocol fee exceeds the upper limit.


```solidity
error ProtocolFeeTooLarge(uint24 fee);
```

### ProtocolFeeCannotBeFetched
Thrown when calls to protocolFeeController fails or return size is not 32 bytes


```solidity
error ProtocolFeeCannotBeFetched();
```

### InvalidCaller
Thrown when user not authorized to set or collect protocol fee


```solidity
error InvalidCaller();
```

