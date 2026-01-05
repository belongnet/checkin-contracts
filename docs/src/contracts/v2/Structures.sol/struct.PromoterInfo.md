# PromoterInfo
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/Structures.sol)

**Title:**
PromoterInfo

Signed payload authorizing distribution of promoter payouts in USDtoken or LONG.


```solidity
struct PromoterInfo {
bool paymentInUSDtoken;
bytes32 promoterReferralCode;
address venue;
uint256 amountInUSD;
}
```

