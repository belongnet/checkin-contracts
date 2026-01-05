# CustomerInfo
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/Structures.sol)

**Title:**
CustomerInfo

Signed payload authorizing a customer payment to a venue (and optional promoter attribution).


```solidity
struct CustomerInfo {
// Backend configurable
bool paymentInUSDtoken;
Bounties toCustomer;
Bounties toPromoter;
// Actors
address customer;
address venueToPayFor;
bytes32 promoterReferralCode;
// Amounts
uint256 amount;
}
```

