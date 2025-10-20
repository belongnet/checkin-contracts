# Belong CheckIn Signature Matrix

Belong CheckIn relies on backend-issued EIP-712 style signatures for every state-changing action involving venues, customers, or promoters. The signer lives in `Factory.nftFactoryParameters().signerAddress`, and `BelongCheckIn` calls `SignatureVerifier` to enforce the signatures. The table below lists **every** signature-validated payload, along with the exact hashing recipe and integration notes.

> ⚠️ The implementation uses `abi.encodePacked(...)` with `keccak256`, not a full `EIP712Domain` struct. You must reproduce the same packed encoding when generating the digest to sign.

## Shared Rules

- **Signer source**: `belongCheckInStorage.contracts.factory.nftFactoryParameters().signerAddress`
- **Verification helper**: `SignatureVerifier` in `contracts/v2/utils/SignatureVerifier.sol`
- **Signature format**: `signMessage(arrayify(hash))` (EIP-191 personal hash equivalent). For EIP-712 toolchains, construct a custom type hash that mirrors the packed encoding.
- **Chain binding**: Every digest includes `block.chainid` as the final field; signatures are chain-specific.
- **ERC-1271 support**: `SignatureCheckerLib.isValidSignatureNow` means smart contract signers are valid if they implement ERC-1271.

## Venue Deposits (`venueDeposit`)

- **Struct**: `VenueInfo`
  ```solidity
  struct VenueInfo {
      VenueRules rules;      // Not part of the signature hash
      address venue;
      uint256 amount;        // Not part of the signature hash
      bytes32 referralCode;
      string uri;
      bytes signature;
  }
  ```
- **Digest**: `keccak256(abi.encodePacked(venue, referralCode, uri, block.chainid))`
- **Reasoning**: Confirms the backend blessed the venue address, referral attribution, and metadata URI for this chain. Amount and rules are enforced on-chain but remain unsigned.
- **Failure modes**: `InvalidSignature()` or `WrongReferralCode()`
- **Example (ethers.js)**:
  ```ts
  const domainHash = ethers.utils.solidityKeccak256(
    ["address","bytes32","string","uint256"],
    [venueInfo.venue, venueInfo.referralCode, venueInfo.uri, chainId]
  );
  venueInfo.signature = await signer.signMessage(ethers.utils.arrayify(domainHash));
  ```

## Customer Payments (`payToVenue`)

- **Struct**: `CustomerInfo`
  ```solidity
  struct CustomerInfo {
      bool paymentInUSDC;
      uint128 visitBountyAmount;
      uint24 spendBountyPercentage;
      address customer;
      address venueToPayFor;
      address promoter;
      uint256 amount;
      bytes signature;
  }
  ```
- **Digest**: `keccak256(abi.encodePacked(paymentInUSDC, visitBountyAmount, spendBountyPercentage, customer, venueToPayFor, promoter, amount, block.chainid))`
- **Additional checks**:
  - `WrongPaymentType()` if the venue’s current `VenueRules.paymentType` disallows the requested currency.
  - `WrongBountyType()` if bounty fields conflict with `VenueRules.bountyType`.
  - `NotEnoughBalance()` if venue credits cannot cover the promoter bounty.
- **Usage tips**:
  - Include `promoter = customer` when self-promoting to direct rewards to the visitor.
  - Backend should re-fetch `VenueRules` before signing to avoid mismatches.
- **Example typescript snippet**:
  ```ts
  const hash = ethers.utils.solidityKeccak256(
    ["bool","uint128","uint24","address","address","address","uint256","uint256"],
    [
      info.paymentInUSDC,
      info.visitBountyAmount,
      info.spendBountyPercentage,
      info.customer,
      info.venueToPayFor,
      info.promoter,
      info.amount,
      chainId
    ]
  );
  info.signature = await signer.signMessage(ethers.utils.arrayify(hash));
  ```

## Promoter Settlements (`distributePromoterPayments`)

- **Struct**: `PromoterInfo`
  ```solidity
  struct PromoterInfo {
      bool paymentInUSDC;      // Not part of the signature hash
      address promoter;
      address venue;
      uint256 amountInUSD;
      bytes signature;
  }
  ```
- **Digest**: `keccak256(abi.encodePacked(promoter, venue, amountInUSD, block.chainid))`
- **Flow**:
  1. Backend calculates withdrawable USD credits and chooses payout currency.
  2. Signs the digest above.
  3. Promoter submits the struct; contract verifies signature, confirms credit balance, applies staking-tier fee (`usdcPercentage` or `longPercentage`), performs swaps, and burns consumed credits.
- **Failure modes**: `InvalidSignature()`, `NotEnoughBalance()`
- **Note**: `paymentInUSDC` flag directs fee calculation but is unsigned; backend must ensure the chosen currency matches business rules before signing.

## Signature Generation Checklist

1. **Normalize types**: Use the exact Solidity bit sizes (bool → `bool`, `uint128`, `uint24`, `address`, `uint256`, `bytes32`, `string`). Any mismatch changes the hash.
2. **Pack fields in order**: The contract uses `abi.encodePacked`; the sequence must match the definitions above.
3. **Include the chain id**: Always append the active chain id as the final argument in the hash.
4. **Sign raw bytes**: Call `signMessage(arrayify(hash))` for EOAs. For EIP-712 frameworks, set `types` and `domain` to reproduce the same hash (see appendix below).
5. **Distribute signature**: Attach the resulting signature to the payload before submitting the transaction.
6. **Handle errors**: Bubble up contract reverts (`InvalidSignature`, `WrongPaymentType`, etc.) to guide retrials.

## Appendix: Optional EIP-712 Typed Definitions

If your tooling requires formal type hashes, you can emulate the packed encoding by introducing synthetic type strings that flatten fields into `bytes`. Example for `CustomerInfo`:

```ts
const types = {
  CustomerInfoPacked: [
    { name: "data", type: "bytes" }
  ]
};

const encoded = ethers.utils.solidityPack(
  ["bool","uint128","uint24","address","address","address","uint256","uint256"],
  [
    info.paymentInUSDC,
    info.visitBountyAmount,
    info.spendBountyPercentage,
    info.customer,
    info.venueToPayFor,
    info.promoter,
    info.amount,
    chainId
  ]
);

const signature = await signer._signTypedData(
  { name: "BelongCheckIn", version: "1", chainId, verifyingContract: belongCheckIn },
  types,
  { data: encoded }
);
```

This produces the same digest because `abi.encodePacked` is reproduced via `solidityPack`. Adjust the domain fields to your preferences; they are ignored on-chain but help standardize client code.

## Documentation To-Do

When updating user-facing docs:

- Highlight that **every** venue deposit, customer payment, and promoter payout requires a fresh backend signature.
- Clarify which fields are signed and which are validated on-chain.
- Describe failure conditions so integrators know how to recover.
- Provide client snippets (like the examples above) so partners can generate signatures correctly.
