# ReferralCodeOwnerError
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v1/factories/utils/ReferralSystem.sol)

Error thrown when a user tries to add themselves as their own referrer, or
thrown when a referral code is used that does not have an owner.


```solidity
error ReferralCodeOwnerError();
```

