# VenueInfo
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/Structures.sol)

**Title:**
VenueInfo

Signed payload authorizing a venue deposit and metadata update.


```solidity
struct VenueInfo {
VenueRules rules;
address venue;
uint256 amount;
bytes32 affiliateReferralCode;
string uri;
}
```

