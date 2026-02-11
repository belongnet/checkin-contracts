# CustomerInfo
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/Structures.sol)

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

