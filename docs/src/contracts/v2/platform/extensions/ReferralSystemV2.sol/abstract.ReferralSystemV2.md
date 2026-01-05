# ReferralSystemV2
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/platform/extensions/ReferralSystemV2.sol)

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


### MAX_TIER_INDEX

```solidity
uint8 public constant MAX_TIER_INDEX = 4
```


### _maxArrayLength

```solidity
uint16 private _maxArrayLength
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
mapping(address referralUser => mapping(bytes32 code => uint8 timesUsed)) public usedCode
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


### getReferralRate

Returns the referral rate for a user and code, based on the number of times the code was used.


```solidity
function getReferralRate(address referralUser, bytes32 code, uint256 amount) public view returns (uint256 rate);
```

### calculateRate

Calculates `percentage` of `amount` using BPS scaling (10_000 == 100%).


```solidity
function calculateRate(uint256 amount, uint256 percentage) public pure returns (uint256 rate);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`amount`|`uint256`|Base amount.|
|`percentage`|`uint256`|Percentage in BPS.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`rate`|`uint256`|Calculated portion of the amount.|


### getReferralCodeByCreator

Computes the deterministic referral code for a creator address.


```solidity
function getReferralCodeByCreator(address creator) public view returns (bytes32);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`creator`|`address`|Creator address.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes32`|The keccak256 hash used as a referral code.|


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


### _setReferralParameters


```solidity
function _setReferralParameters(uint16[5] calldata percentages, uint16 maxArrayLength) internal;
```

## Events
### ReferralParametersSet
Emitted when referral percentages are set.


```solidity
event ReferralParametersSet(uint16[5] percentages, uint16 maxArrayLength);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`percentages`|`uint16[5]`|The new referral percentages.|
|`maxArrayLength`|`uint16`||

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

## Errors
### ReferralCodeExists
Error thrown when a referral code already exists for the creator.


```solidity
error ReferralCodeExists(address referralCreator, bytes32 hashedCode);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`referralCreator`|`address`|The address of the creator who already has a referral code.|
|`hashedCode`|`bytes32`|The existing referral code.|

### ReferralCreatorNotExists
Error thrown when a user tries to add themselves as their own referrer, or
thrown when a referral code is used that does not have an owner.


```solidity
error ReferralCreatorNotExists();
```

### ReferralUserIsReferralCreator

```solidity
error ReferralUserIsReferralCreator();
```

### ReferralCodeNotUsedByUser
Error thrown when a user attempts to get a referral rate for a code they haven't used.


```solidity
error ReferralCodeNotUsedByUser(address referralUser, bytes32 code);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`referralUser`|`address`|The address of the user who did not use the code.|
|`code`|`bytes32`|The referral code the user has not used.|

### PercentageExceedsMax

```solidity
error PercentageExceedsMax(uint16 percentage);
```

### MaxArrayLengthExceedsMax

```solidity
error MaxArrayLengthExceedsMax(uint16 maxArrayLength);
```

## Structs
### ReferralCode
Struct for managing a referral code and its users.


```solidity
struct ReferralCode {
    /// @notice The creator of the referral code.
    address creator;
    /// @notice The list of users who have used the referral code.
    address[] referralUsers;
}
```

