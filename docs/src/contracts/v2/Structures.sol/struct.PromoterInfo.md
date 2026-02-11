# PromoterInfo
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/Structures.sol)

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

