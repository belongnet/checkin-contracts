# Solidity API

## SignatureVerifier

Stateless helpers to verify backend-signed payloads for collection creation,
credit token creation, vesting wallet deployment, venue/customer/promoter actions,
and mint parameter checks.
@dev
- Uses `SignatureCheckerLib.isValidSignatureNow` for EOA or ERC-1271 signatures.
- All hashes include `verifyingContract`, `nonce`, `deadline`, and `block.chainid`.
- The contract does not persist nonces; replay protection must be handled off-chain.

### SignatureProtection

```solidity
struct SignatureProtection {
  uint256 nonce;
  uint256 deadline;
  bytes signature;
}
```

### Digest Format

```solidity
keccak256(abi.encode(
  verifyingContract,
  protection.nonce,
  protection.deadline,
  block.chainid,
  ...payloadFields
))
```

### InvalidSignature

```solidity
error InvalidSignature(bytes signature)
```

Thrown when a signature does not match the expected signer/payload or is not canonical.

### EmptyMetadata

```solidity
error EmptyMetadata(string name, string symbol)
```

Thrown when collection metadata (name/symbol) is empty.

### WrongPaymentType

```solidity
error WrongPaymentType()
```

Thrown when the customer's requested payment type conflicts with venue rules.

### EmptyReferralCode

```solidity
error EmptyReferralCode()
```

Thrown when a promoter bounty is expected but the referral code is empty.

### NoBountiesRelated

```solidity
error NoBountiesRelated()
```

Defined for bounty validation flows (currently unused).

### NoBountyAllocationTypeSpecified

```solidity
error NoBountyAllocationTypeSpecified()
```

Thrown when a venue defines bounties but omits allocation type.

### WrongCustomerBountyType

```solidity
error WrongCustomerBountyType()
```

Thrown when the bounty type derived from customer payload conflicts with venue rules.

### SignatureExpired

```solidity
error SignatureExpired()
```

Thrown when a signed payload is past its deadline.

### checkAccessTokenInfo

```solidity
function checkAccessTokenInfo(
  address signer,
  address verifyingContract,
  SignatureProtection protection,
  struct AccessTokenInfo accessTokenInfo
) external view
```

Signed fields (after prefix):
`creator`, `metadata.name`, `metadata.symbol`, `contractURI`, `feeNumerator`.

### checkCreditTokenInfo

```solidity
function checkCreditTokenInfo(
  address signer,
  address verifyingContract,
  SignatureProtection protection,
  struct ERC1155Info creditTokenInfo
) external view
```

Signed fields (after prefix):
`name`, `symbol`, `uri`.

### checkVestingWalletInfo

```solidity
function checkVestingWalletInfo(
  address signer,
  address verifyingContract,
  SignatureProtection protection,
  address owner,
  struct VestingWalletInfo vestingWalletInfo
) external view
```

Signed fields (after prefix):
`owner`, `startTimestamp`, `cliffDurationSeconds`, `durationSeconds`,
`token`, `beneficiary`, `totalAllocation`, `tgeAmount`, `linearAllocation`.

### checkVenueInfo

```solidity
function checkVenueInfo(
  address signer,
  address verifyingContract,
  SignatureProtection protection,
  struct VenueInfo venueInfo
) external view
```

Signed fields (after prefix):
`venue`, `affiliateReferralCode`, `uri`.

### checkCustomerInfo

```solidity
function checkCustomerInfo(
  address signer,
  address verifyingContract,
  SignatureProtection protection,
  struct CustomerInfo customerInfo,
  struct VenueRules rules
) external view
```

Signed fields (after prefix):
`rules.bountyType`, `rules.bountyAllocationType`, `customerInfo.paymentInUSDtoken`,
`abi.encode(toCustomer.visitBountyAmount, toCustomer.spendBountyPercentage)`,
`abi.encode(toPromoter.visitBountyAmount, toPromoter.spendBountyPercentage)`,
`customer`, `venueToPayFor`, `promoterReferralCode`, `amount`.

### checkPromoterPaymentDistribution

```solidity
function checkPromoterPaymentDistribution(
  address signer,
  address verifyingContract,
  SignatureProtection protection,
  struct PromoterInfo promoterInfo
) external view
```

Signed fields (after prefix):
`promoterReferralCode`, `venue`, `amountInUSD`.

### checkDynamicPriceParameters

```solidity
function checkDynamicPriceParameters(
  address signer,
  address verifyingContract,
  SignatureProtection protection,
  address receiver,
  struct DynamicPriceParameters params
) external view
```

Signed fields (after prefix):
`receiver`, `tokenId`, `tokenUri`, `price`.

### checkStaticPriceParameters

```solidity
function checkStaticPriceParameters(
  address signer,
  address verifyingContract,
  SignatureProtection protection,
  address receiver,
  struct StaticPriceParameters params
) external view
```

Signed fields (after prefix):
`receiver`, `tokenId`, `tokenUri`, `whitelisted`.
