# Solidity API

## ReferralSystemV2

Provides referral system functionality, including creating referral codes, setting users, and managing referral percentages.

_This abstract contract allows contracts that inherit it to implement referral code-based rewards and tracking._

### ReferralCodeExists

```solidity
error ReferralCodeExists(address referralCreator, bytes32 hashedCode)
```

Error thrown when a referral code already exists for the creator.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| referralCreator | address | The address of the creator who already has a referral code. |
| hashedCode | bytes32 | The existing referral code. |

### ReferralCreatorNotExists

```solidity
error ReferralCreatorNotExists()
```

Error thrown when a user tries to add themselves as their own referrer, or
thrown when a referral code is used that does not have an owner.

### ReferralUserIsReferralCreator

```solidity
error ReferralUserIsReferralCreator()
```

### ReferralCodeNotUsedByUser

```solidity
error ReferralCodeNotUsedByUser(address referralUser, bytes32 code)
```

Error thrown when a user attempts to get a referral rate for a code they haven't used.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| referralUser | address | The address of the user who did not use the code. |
| code | bytes32 | The referral code the user has not used. |

### PercentageExceedsMax

```solidity
error PercentageExceedsMax(uint16 percentage)
```

### ReferralParametersSet

```solidity
event ReferralParametersSet(uint16[5] percentages)
```

Emitted when referral percentages are set.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| percentages | uint16[5] | The new referral percentages. |

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

### ReferralCode

Struct for managing a referral code and its users.

```solidity
struct ReferralCode {
  address creator;
  address[] referralUsers;
}
```

### SCALING_FACTOR

```solidity
uint16 SCALING_FACTOR
```

The scaling factor for referral percentages.

### MAX_TIER_INDEX

```solidity
uint8 MAX_TIER_INDEX
```

### usedToPercentage

```solidity
uint16[5] usedToPercentage
```

Maps the number of times a referral code was used to the corresponding percentage.

### referrals

```solidity
mapping(bytes32 => struct ReferralSystemV2.ReferralCode) referrals
```

Maps referral codes to their respective details (creator and users).

### usedCode

```solidity
mapping(address => mapping(bytes32 => uint8)) usedCode
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

### getReferralRate

```solidity
function getReferralRate(address referralUser, bytes32 code, uint256 amount) public view returns (uint256 rate)
```

Returns the referral rate for a user and code, based on the number of times the code was used.

### calculateRate

```solidity
function calculateRate(uint256 amount, uint256 percentage) public pure returns (uint256 rate)
```

Calculates `percentage` of `amount` using BPS scaling (10_000 == 100%).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Base amount. |
| percentage | uint256 | Percentage in BPS. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| rate | uint256 | Calculated portion of the amount. |

### getReferralCodeByCreator

```solidity
function getReferralCodeByCreator(address creator) public view returns (bytes32)
```

Computes the deterministic referral code for a creator address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| creator | address | Creator address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | The keccak256 hash used as a referral code. |

### getReferralCreator

```solidity
function getReferralCreator(bytes32 code) public view returns (address)
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

### _setReferralParameters

```solidity
function _setReferralParameters(uint16[5] percentages) internal
```

