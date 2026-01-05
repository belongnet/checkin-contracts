# ReferralCodeExists
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/factories/utils/ReferralSystem.sol)

Error thrown when a referral code already exists for the creator.


```solidity
error ReferralCodeExists(address referralCreator, bytes32 hashedCode);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`referralCreator`|`address`|The address of the creator who already has a referral code.|
|`hashedCode`|`bytes32`|The existing referral code.|

