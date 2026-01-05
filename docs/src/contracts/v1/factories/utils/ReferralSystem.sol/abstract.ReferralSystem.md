# ReferralSystem
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v1/factories/utils/ReferralSystem.sol)

**Title:**
Referral System Contract

Provides referral system functionality, including creating referral codes, setting users, and managing referral percentages.

This abstract contract allows contracts that inherit it to implement referral code-based rewards and tracking.


## State Variables
### SCALING_FACTOR
The scaling factor for referral percentages.


```solidity
uint16 public constant SCALING_FACTOR = 10000
```


### usedToPercentage
Maps the number of times a referral code was used to the corresponding percentage.


```solidity
uint16[5] public usedToPercentage
```


### referrals
Maps referral codes to their respective details (creator and users).


```solidity
mapping(bytes32 code => ReferralCode referralCode) internal referrals
```


### usedCode
Maps referral users to their respective used codes and counts the number of times the code was used.


```solidity
mapping(address referralUser => mapping(bytes32 code => uint256 timesUsed)) public usedCode
```


### __gap
Reserved storage space to allow for layout changes in the future.


```solidity
uint256[50] private __gap
```


## Functions
### createReferralCode

Creates a new referral code for the caller.

The referral code is a hash of the caller's address.


```solidity
function createReferralCode() external returns (bytes32 hashedCode);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`hashedCode`|`bytes32`|The created referral code.|


### _setReferralUser

Sets a referral user for a given referral code.

Internal function that tracks how many times the user has used the code.


```solidity
function _setReferralUser(bytes32 hashedCode, address referralUser) internal;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`hashedCode`|`bytes32`|The referral code.|
|`referralUser`|`address`|The address of the user being referred.|


### _setReferralPercentages

Sets the referral percentages based on the number of times a code is used.

Internal function to set referral percentages.


```solidity
function _setReferralPercentages(uint16[5] calldata percentages) internal;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`percentages`|`uint16[5]`|Array of five BPS values mapping usage count (0..4) to a referral percentage.|


### getReferralRate

Returns the referral rate for a user and code, based on the number of times the code was used.


```solidity
function getReferralRate(address referralUser, bytes32 code, uint256 amount) external view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`referralUser`|`address`|The user who used the referral code.|
|`code`|`bytes32`|The referral code used.|
|`amount`|`uint256`|The amount to calculate the referral rate on.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The calculated referral rate based on the usage of the referral code.|


### getReferralCreator

Returns the creator of a given referral code.


```solidity
function getReferralCreator(bytes32 code) public view returns (address);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`code`|`bytes32`|The referral code to get the creator for.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address`|The address of the creator associated with the referral code.|


### getReferralUsers

Returns the list of users who used a given referral code.


```solidity
function getReferralUsers(bytes32 code) external view returns (address[] memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`code`|`bytes32`|The referral code to get the users for.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address[]`|An array of addresses that used the referral code.|


### _getRate


```solidity
function _getRate(address referralUser, bytes32 code, uint256 amount)
    internal
    view
    returns (uint256 used, uint256 rate);
```

## Events
### PercentagesSet
Emitted when referral percentages are set.


```solidity
event PercentagesSet(uint16[5] percentages);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`percentages`|`uint16[5]`|The new referral percentages.|

### ReferralCodeCreated
Emitted when a new referral code is created.


```solidity
event ReferralCodeCreated(address indexed createdBy, bytes32 indexed code);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`createdBy`|`address`|The address that created the referral code.|
|`code`|`bytes32`|The created referral code.|

### ReferralCodeUsed
Emitted when a referral code is used.


```solidity
event ReferralCodeUsed(bytes32 indexed code, address indexed usedBy);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`code`|`bytes32`|The referral code that was used.|
|`usedBy`|`address`|The address that used the referral code.|

