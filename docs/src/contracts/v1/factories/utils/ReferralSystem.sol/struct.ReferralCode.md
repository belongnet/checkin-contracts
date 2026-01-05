# ReferralCode
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/factories/utils/ReferralSystem.sol)

Struct for managing a referral code and its users.


```solidity
struct ReferralCode {
/// @notice The creator of the referral code.
address creator;
/// @notice The list of users who have used the referral code.
address[] referralUsers;
}
```

