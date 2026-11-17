# Belong CheckIn Signature Matrix (v2)

BelongCheckIn, Factory and AccessToken rely on backend-issued signatures validated by
`SignatureVerifier`. The `SignatureProtection` struct carries `nonce`, `deadline`, and `signature`.

Every digest has the same shape:

```
digest = keccak256(abi.encode(
  TYPEHASH,            // bytes32, one constant per message kind (table below)
  verifyingContract,   // address
  nonce,               // uint256
  deadline,            // uint256
  chainId,             // uint256
  ...payload           // listed per message kind
))
```

## What changed in this format

- **Type hash first.** Each message kind starts with its own constant, so a signature issued for one
  action is never valid for another. Before, a static-price mint signature was also a valid
  dynamic-price mint signature with price 0.
- **Whole payload signed.** Payload structs are encoded as ABI tuples, exactly as they are passed to
  the contract. Fields that used to be "unsigned but supplied" are now signed: `amount` and `rules`
  of a venue deposit, `paymentInUSDtoken` of a promoter payout, the economics of an AccessToken, the
  roles of a CreditToken, and the referral code passed to `Factory.produce`.
- **One-time use on-chain.** Factory and BelongCheckIn record every executed digest in
  `usedSignatures(digest)` and revert with `SignatureAlreadyUsed(digest)` on a second submission.
  Mint signatures are the exception: AccessToken does not record them, and a token id can only be
  minted once.

## Rolling out this format

The format lives in the contracts, so it takes effect contract by contract:

- **Factory and BelongCheckIn** are proxies. They switch to this format when their implementations
  are upgraded, together with a newly deployed `SignatureVerifier` library. Signatures issued in the
  old format and not yet used stop working at that moment, so the backend must switch at the same
  time.
- **New AccessToken collections** use this format only after a new AccessToken implementation is
  deployed and installed with `Factory.setFactoryParameters`. Upgrading the Factory alone does not
  change which AccessToken implementation it deploys.
- **Existing AccessToken collections** are proxies owned by their creators and keep the
  implementation they were created with. They keep verifying the old mint digests (no type hash)
  until the creator upgrades them. For those collections the backend must issue dynamic-price
  signatures only, never static-price ones: under the old digests a static-price signature is also a
  valid dynamic-price signature for price 0 or 1.

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
- **verifyingContract**: the contract performing verification (`BelongCheckIn`, `Factory`, or an
  `AccessToken` instance).
- **deadline**: unix seconds; reverts with `SignatureExpired` if `deadline < block.timestamp`.
- **nonce**: any value. It makes two otherwise identical payloads produce different digests. To
  authorize the same action twice, issue a second signature with a new nonce.
- **Encoding**: `keccak256(abi.encode(...))` (not `encodePacked`, no EIP-712 domain).
- **Signature format**: an ECDSA signature over the 32-byte digest itself, with no EIP-191 prefix
  (`SigningKey.signDigest(digest)` in ethers v5, not `signMessage`). Accepted encodings are 65 bytes
  (`r, s, v` with `v` 27 or 28 and low `s`) or 64 bytes (EIP-2098).

## Type Hashes

`TYPEHASH = keccak256("Belong.SignatureVerifier.v2.<Kind>")`.

| Kind | Value |
|------|-------|
| `AccessTokenInfo` | `0x61ef9eaf33bddd33f385fb08a895ebdb198dd30192b88be52538ae027c465582` |
| `CreditTokenInfo` | `0x4e293e14d5e125e27c1ccb178266891ff8746405c2a008ee2a95da32c3b2f0b4` |
| `VestingWalletInfo` | `0x876f057a16150569d58b905635e060d8afcf888373646b68f395700e6dd76fe6` |
| `VenueInfo` | `0xa5762738c53d587e25e465a86238ef1ddd3f3e5d10a8e7fae780a6c6d750bf61` |
| `CustomerInfo` | `0xfde485bd3cf7ff92e2ef75afefe194cfeeabd8c53be66cb16b1e8377af0cd8f2` |
| `PromoterInfo` | `0x0b58c50b8db4918730b7615a788309bd88d7e01bae685a57c171dde0d86d05bc` |
| `StaticPriceMint` | `0xfc43b2a890e44aaa5af4802f68f56b630824bbad4d59b2a47b7ab9902147c9dd` |
| `DynamicPriceMint` | `0x6212d779bd7a253de93b7ea1349af14d30a8e90576325acb46e4db3c351dc8f1` |

## Example (ethers v5)

```ts
import { utils } from 'ethers';

const VENUE_INFO_TYPEHASH = utils.id('Belong.SignatureVerifier.v2.VenueInfo');
const VENUE_INFO_TUPLE =
  'tuple(tuple(uint8 paymentType, uint8 bountyType, uint8 bountyAllocationType, uint8 longPaymentType) rules, address venue, uint256 amount, bytes32 affiliateReferralCode, string uri)';

const digest = utils.keccak256(
  utils.defaultAbiCoder.encode(
    ['bytes32', 'address', 'uint256', 'uint256', 'uint256', VENUE_INFO_TUPLE],
    [VENUE_INFO_TYPEHASH, belongCheckIn.address, nonce, deadline, chainId, venueInfo],
  ),
);
const signature = utils.joinSignature(new utils.SigningKey(signerPrivateKey).signDigest(digest));
```

`helpers/signature.ts` holds a reference implementation of every message kind.

## Payloads (BelongCheckIn)

### Venue Deposits: `venueDeposit` / `venueDepositWithDeadline`

Type hash `VenueInfo`. Payload after the shared prefix:

- `venueInfo` as a tuple:
  `((uint8 paymentType, uint8 bountyType, uint8 bountyAllocationType, uint8 longPaymentType) rules, address venue, uint256 amount, bytes32 affiliateReferralCode, string uri)`

### Customer Payments: `payToVenue` / `payToVenueWithDeadline`

Type hash `CustomerInfo`. Payload after the shared prefix:

- `uint8 rules.bountyType` and `uint8 rules.bountyAllocationType`, read from the venue's stored rules
  when the payment executes. A signature stops being valid if the venue changes those rules.
- `customerInfo` as a tuple:
  `(bool paymentInUSDtoken, (uint24 spendBountyPercentage, uint128 visitBountyAmount) toCustomer, (uint24 spendBountyPercentage, uint128 visitBountyAmount) toPromoter, address customer, address venueToPayFor, bytes32 promoterReferralCode, uint256 amount)`

Validated on-chain but not part of the digest: `VenueRules.paymentType`, credit balances, and
reward limits.

### Promoter Settlements: `distributePromoterPayments` / `distributePromoterPaymentsWithDeadline`

Type hash `PromoterInfo`. Payload after the shared prefix:

- `promoterInfo` as a tuple:
  `(bool paymentInUSDtoken, bytes32 promoterReferralCode, address venue, uint256 amountInUSD)`

## Payloads (Factory)

### AccessToken creation: `Factory.produce`

Type hash `AccessTokenInfo`. Payload after the shared prefix:

- `accessTokenInfo` as a tuple:
  `(address creator, address paymentToken, uint96 feeNumerator, bool transferable, uint256 maxTotalSupply, uint256 mintPrice, uint256 whitelistMintPrice, (string name, string symbol) metadata, string contractURI)`
- `bytes32 referralCode`, the second argument of `produce` (zero when there is none).

Sign the struct exactly as it is submitted. If `paymentToken` is submitted as the zero address so
that the factory applies its default currency, sign the zero address.

### CreditToken creation: `Factory.produceCreditToken`

Type hash `CreditTokenInfo`. Payload after the shared prefix:

- `creditTokenInfo` as a tuple:
  `(address defaultAdmin, bool transferable, address manager, address minter, address burner, string name, string symbol, string uri)`

### Vesting wallet creation: `Factory.deployVestingWallet*`

Type hash `VestingWalletInfo`. Payload after the shared prefix:

- `address owner`
- `vestingWalletInfo` as a tuple:
  `(uint64 startTimestamp, uint64 cliffDurationSeconds, uint64 durationSeconds, address token, address beneficiary, uint256 totalAllocation, uint256 tgeAmount, uint256 linearAllocation, string description)`
- `uint256 initialFunding`, the amount the caller funds the wallet with on deployment:
  `totalAllocation` for `deployVestingWallet`, `0` for `deployVestingWalletWithoutInitialFunding`, and the
  `initialFunding` argument for `deployVestingWalletWithInitialFunding`.

## Payloads (AccessToken mints)

Mint signatures are not recorded on-chain. A token id can be minted once, which is what prevents a
second use.

### `mintStaticPrice`

Type hash `StaticPriceMint`. Payload after the shared prefix:

- `address receiver`
- `uint256 tokenId`
- `string tokenUri`
- `bool whitelisted`

### `mintDynamicPrice`

Type hash `DynamicPriceMint`. Payload after the shared prefix:

- `address receiver`
- `uint256 tokenId`
- `string tokenUri`
- `uint256 price`

## Integration Checklist

1. Start the encoding with the type hash of the message kind.
2. Use the correct `verifyingContract` address.
3. Match the exact tuple types and ordering used in `abi.encode`.
4. Provide a future `deadline`; expired payloads revert.
5. Issue a new nonce for every signature. A signature executes once; a retry needs a new one.
6. Sign the 32-byte digest directly, without the EIP-191 message prefix.
