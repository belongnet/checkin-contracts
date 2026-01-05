# Belong CheckIn Signature Matrix (v2)

BelongCheckIn and Factory rely on backend-issued signatures validated by
`SignatureVerifier`. Hashing uses `keccak256(abi.encode(...))` with a shared
prefix of `(verifyingContract, nonce, deadline, chainId)`. The
`SignatureProtection` struct carries `nonce`, `deadline`, and `signature`.

> Note: `SignatureVerifier` does not store or consume nonces on-chain. The
> backend must persist nonces and reject replays.

## SignatureProtection

```solidity
struct SignatureProtection {
    uint256 nonce;
    uint256 deadline;
    bytes signature;
}
```

## Shared Rules

- **Signer**: `Factory.nftFactoryParameters().signerAddress`.
- **verifyingContract**: the contract performing verification (`BelongCheckIn`,
  `Factory`, or an `AccessToken` instance).
- **deadline**: unix seconds; reverts if `deadline < block.timestamp`.
- **nonce**: arbitrary; enforce uniqueness off-chain.
- **Encoding**: `keccak256(abi.encode(...))` (not `encodePacked`, no EIP-712 domain).
- **Signature format**: EIP-191 `signMessage(arrayify(digest))`; ERC-1271 is supported.

## Digest Format

```
digest = keccak256(abi.encode(
  verifyingContract,
  nonce,
  deadline,
  chainId,
  ...payloadFields
))
```

Example (ethers.js):

```ts
import { keccak256, defaultAbiCoder, arrayify } from "ethers/lib/utils";

const digest = keccak256(
  defaultAbiCoder.encode(
    ["address","uint256","uint256","uint256","address","bytes32","string"],
    [verifyingContract, nonce, deadline, chainId, venue, affiliateReferralCode, uri]
  )
);
const signature = await signer.signMessage(arrayify(digest));
```

## Payloads (BelongCheckIn)

### Venue Deposits: `venueDeposit` / `venueDepositWithDeadline`

Signed fields after the shared prefix:

- `venue`
- `affiliateReferralCode`
- `uri`

Unsigned but validated on-chain: `rules`, `amount`.

### Customer Payments: `payToVenue` / `payToVenueWithDeadline`

Signed fields after the shared prefix:

- `rules.bountyType`
- `rules.bountyAllocationType`
- `customerInfo.paymentInUSDtoken`
- `abi.encode(toCustomer.visitBountyAmount, toCustomer.spendBountyPercentage)`
- `abi.encode(toPromoter.visitBountyAmount, toPromoter.spendBountyPercentage)`
- `customer`
- `venueToPayFor`
- `promoterReferralCode`
- `amount`

Unsigned but validated on-chain: `VenueRules.paymentType`, credit balances, and
reward limits.

### Promoter Settlements: `distributePromoterPayments`

Signed fields after the shared prefix:

- `promoterReferralCode`
- `venue`
- `amountInUSD`

Unsigned but used: `paymentInUSDtoken` (backend must enforce its business rules).

## Payloads (Factory)

### AccessToken creation: `Factory.produce`

Signed fields after the shared prefix:

- `creator`
- `metadata.name`
- `metadata.symbol`
- `contractURI`
- `feeNumerator`

Unsigned but supplied: `paymentToken`, `transferable`, `maxTotalSupply`,
`mintPrice`, `whitelistMintPrice`.

### CreditToken creation: `Factory.produceCreditToken`

Signed fields after the shared prefix:

- `name`
- `symbol`
- `uri`

Unsigned but supplied: `defaultAdmin`, `manager`, `minter`, `burner`,
`transferable`.

### Vesting wallet creation: `Factory.deployVestingWallet`

Signed fields after the shared prefix:

- `owner`
- `startTimestamp`
- `cliffDurationSeconds`
- `durationSeconds`
- `token`
- `beneficiary`
- `totalAllocation`
- `tgeAmount`
- `linearAllocation`

Unsigned but supplied: `description`.

## Payloads (AccessToken mints)

### `mintStaticPrice`

Signed fields after the shared prefix:

- `receiver`
- `tokenId`
- `tokenUri`
- `whitelisted`

### `mintDynamicPrice`

Signed fields after the shared prefix:

- `receiver`
- `tokenId`
- `tokenUri`
- `price`

## Integration Checklist

1. Use the correct `verifyingContract` address.
2. Match the exact types and ordering used in `abi.encode`.
3. Provide a future `deadline`; reject expired payloads.
4. Persist and invalidate nonces server-side to prevent replay.
5. Sign the raw digest bytes (`signMessage`) or use an ERC-1271 signer.
