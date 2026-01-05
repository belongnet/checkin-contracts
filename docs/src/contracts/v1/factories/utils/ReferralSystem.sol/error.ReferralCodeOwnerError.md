# ReferralCodeOwnerError
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/factories/utils/ReferralSystem.sol)

Error thrown when a user tries to add themselves as their own referrer, or
thrown when a referral code is used that does not have an owner.


```solidity
error ReferralCodeOwnerError();
```

