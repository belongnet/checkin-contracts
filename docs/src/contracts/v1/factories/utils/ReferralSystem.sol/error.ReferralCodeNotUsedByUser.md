# ReferralCodeNotUsedByUser
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/factories/utils/ReferralSystem.sol)

Error thrown when a user attempts to get a referral rate for a code they haven't used.


```solidity
error ReferralCodeNotUsedByUser(address referralUser, bytes32 code);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`referralUser`|`address`|The address of the user who did not use the code.|
|`code`|`bytes32`|The referral code the user has not used.|

