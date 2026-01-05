# ReferralCodeExists
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v1/factories/utils/ReferralSystem.sol)

Error thrown when a referral code already exists for the creator.


```solidity
error ReferralCodeExists(address referralCreator, bytes32 hashedCode);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`referralCreator`|`address`|The address of the creator who already has a referral code.|
|`hashedCode`|`bytes32`|The existing referral code.|

