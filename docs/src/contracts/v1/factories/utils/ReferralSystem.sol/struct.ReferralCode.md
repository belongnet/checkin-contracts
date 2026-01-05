# ReferralCode
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v1/factories/utils/ReferralSystem.sol)

Struct for managing a referral code and its users.


```solidity
struct ReferralCode {
/// @notice The creator of the referral code.
address creator;
/// @notice The list of users who have used the referral code.
address[] referralUsers;
}
```

