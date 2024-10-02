# Solidity API

## ReferralCodeExists

```solidity
error ReferralCodeExists(address referralCreator, bytes32 hashedCode)
```

Error thrown when a referral code already exists for the creator.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| referralCreator | address | The address of the creator who already has a referral code. |
| hashedCode | bytes32 | The existing referral code. |

## ReferralCodeUserExists

```solidity
error ReferralCodeUserExists(address referralUser)
```

Error thrown when the referral user already exists for a given code.

## ReferralCodeOwnerNotExist

```solidity
error ReferralCodeOwnerNotExist(bytes32 hashedCode)
```

Error thrown when a referral code is used that does not have an owner.

## CannotReferSelf

```solidity
error CannotReferSelf()
```

Error thrown when a user tries to add themselves as their own referrer.

## ReferralUserToCodeError

```solidity
error ReferralUserToCodeError(address referralUser, bytes32 code)
```

## ReferralSystem

Provides referral system functionality, including creating referral codes, setting users, and managing referral percentages.

_This abstract contract allows contracts that inherit it to implement referral code-based rewards and tracking._

### PercentagesSet

```solidity
event PercentagesSet(struct ReferralPercentages percentages)
```

Emitted when referral percentages are set.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| percentages | struct ReferralPercentages | The new referral percentages. |

### ReferralCodeCreated

```solidity
event ReferralCodeCreated(address createdBy, bytes32 code)
```

Emitted when a new referral code is created.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| createdBy | address | The address that created the referral code. |
| code | bytes32 | The created referral code. |

### ReferralCodeUsed

```solidity
event ReferralCodeUsed(bytes32 code, address usedBy)
```

Emitted when a referral code is used.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| code | bytes32 | The referral code that was used. |
| usedBy | address | The address that used the referral code. |

### SCALING_FACTOR

```solidity
uint16 SCALING_FACTOR
```

The scaling factor for referral percentages.

### usedToPercentage

```solidity
mapping(uint256 => uint16) usedToPercentage
```

Maps the number of times a referral code was used to the corresponding percentage.

### referrals

```solidity
mapping(bytes32 => struct ReferralCode) referrals
```

Maps referral codes to their respective details (creator and users).

### usedCode

```solidity
mapping(address => mapping(bytes32 => uint256)) usedCode
```

Maps referral users to their respective used codes and counts the number of times the code was used.

### createReferralCode

```solidity
function createReferralCode() external returns (bytes32 hashedCode)
```

Creates a new referral code for the caller.

_The referral code is a hash of the caller's address._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| hashedCode | bytes32 | The created referral code. |

### _setReferralUser

```solidity
function _setReferralUser(bytes32 hashedCode, address referralUser) internal
```

Sets a referral user for a given referral code.

_Internal function that tracks how many times the user has used the code._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| hashedCode | bytes32 | The referral code. |
| referralUser | address | The address of the user being referred. |

### _setReferralPercentages

```solidity
function _setReferralPercentages(struct ReferralPercentages percentages) internal
```

Sets the referral percentages based on the number of times a code is used.

_Internal function to set referral percentages._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| percentages | struct ReferralPercentages | A struct containing the referral percentages for initial, second, third, and default use. |

### getReferralRate

```solidity
function getReferralRate(address referralUser, bytes32 code, uint256 amount) external view returns (uint256)
```

Returns the referral rate for a user and code, based on the number of times the code was used.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| referralUser | address | The user who used the referral code. |
| code | bytes32 | The referral code used. |
| amount | uint256 | The amount to calculate the referral rate on. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The calculated referral rate based on the usage of the referral code. |

### getReferralCreator

```solidity
function getReferralCreator(bytes32 code) external view returns (address)
```

Returns the creator of a given referral code.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| code | bytes32 | The referral code to get the creator for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the creator associated with the referral code. |

### getReferralUsers

```solidity
function getReferralUsers(bytes32 code) external view returns (address[])
```

Returns the list of users who used a given referral code.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| code | bytes32 | The referral code to get the users for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | An array of addresses that used the referral code. |

