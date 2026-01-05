# VenueInfo
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/Structures.sol)

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

