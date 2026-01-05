# ReferralCodeNotUsedByUser
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v1/factories/utils/ReferralSystem.sol)

Error thrown when a user attempts to get a referral rate for a code they haven't used.


```solidity
error ReferralCodeNotUsedByUser(address referralUser, bytes32 code);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`referralUser`|`address`|The address of the user who did not use the code.|
|`code`|`bytes32`|The referral code the user has not used.|

