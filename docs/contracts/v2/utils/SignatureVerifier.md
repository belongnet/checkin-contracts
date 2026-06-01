# Solidity API

## SignatureVerifier

Stateless helpers to verify backend-signed payloads for collection creation,
        credit token creation, vesting wallet deployment, venue/customer/promoter actions,
        and mint parameter checks.
@dev
- Uses `SignatureCheckerLib.isValidSignatureNow` for EOA or ERC1271 signatures.
- All hashes include `block.chainid` to bind signatures to a specific chain.
- Uses `abi.encode` for collision-safe hashing of multiple dynamic fields.
- Mint digests are bound to the specific verifying contract, include `nonce` and `deadline`,
  and hash dynamic strings with `keccak256(bytes(...))` to avoid ambiguity.
- `nonce` is part of the signed digest, but this library does not store/consume nonces;
  replay protection must be enforced by the integrating contract and/or backend policy.

### SignatureProtection

```solidity
struct SignatureProtection {
  uint256 nonce;
  uint256 deadline;
  bytes signature;
}
```

### InvalidSignature

```solidity
error InvalidSignature(bytes signature)
```

Thrown when a signature does not match the expected signer/payload.

### EmptyMetadata

```solidity
error EmptyMetadata(string name, string symbol)
```

Thrown when collection metadata (name/symbol) is empty.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| name | string | The provided collection name. |
| symbol | string | The provided collection symbol. |

### WrongPaymentType

```solidity
error WrongPaymentType()
```

Thrown when the customer's requested payment type conflicts with venue rules.

### EmptyReferralCode

```solidity
error EmptyReferralCode()
```

Thrown when the bounty type derived from customer payload conflicts with venue rules.

### NoBountiesRelated

```solidity
error NoBountiesRelated()
```

### NoBountyAllocationTypeSpecified

```solidity
error NoBountyAllocationTypeSpecified()
```

### WrongCustomerBountyType

```solidity
error WrongCustomerBountyType()
```

### SignatureExpired

```solidity
error SignatureExpired()
```

Thrown when a signed payload is past its deadline.

### checkAccessTokenInfo

```solidity
function checkAccessTokenInfo(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, struct AccessTokenInfo accessTokenInfo) external view
```

Verifies AccessToken collection creation payload.

_Hash covers: `name`, `symbol`, `contractURI`, `feeNumerator`, and `chainId`.
     Uses `abi.encode` to prevent collisions on multiple dynamic fields._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address |  |
| protection | struct SignatureVerifier.SignatureProtection |  |
| accessTokenInfo | struct AccessTokenInfo | Payload to verify. Only the fields listed above are signed. |

### checkCreditTokenInfo

```solidity
function checkCreditTokenInfo(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, struct ERC1155Info creditTokenInfo) external view
```

Verifies CreditToken (ERC1155) collection creation payload.

_Hash covers: `name`, `symbol`, `uri`, and `chainId`.
     Uses `abi.encode` to avoid packed collisions._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address |  |
| protection | struct SignatureVerifier.SignatureProtection |  |
| creditTokenInfo | struct ERC1155Info | Payload. Only the fields listed above are signed. |

### checkVestingWalletInfo

```solidity
function checkVestingWalletInfo(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, address owner, struct VestingWalletInfo vestingWalletInfo) external view
```

Verifies VestingWallet deployment payload including owner and schedule parameters.

_Hash covers: `owner`, `startTimestamp`, `cliffDurationSeconds`, `durationSeconds`,
     `token`, `beneficiary`, `totalAllocation`, `tgeAmount`, `linearAllocation`, and `chainId`.
     Uses `abi.encode` (not packed).
     `vestingWalletInfo.description` is intentionally not part of the signed digest._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address | Address expected in the signed payload. |
| protection | struct SignatureVerifier.SignatureProtection | Signature payload with `nonce`, `deadline`, and signer signature. |
| owner | address | Intended vesting wallet owner. |
| vestingWalletInfo | struct VestingWalletInfo | Full vesting schedule configuration and metadata. |

### checkVenueInfo

```solidity
function checkVenueInfo(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, struct VenueInfo venueInfo) external view
```

Verifies venue deposit intent and metadata.

_Hash covers: `venue`, `referralCode`, `uri`, and `chainId`. Uses `abi.encode`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address |  |
| protection | struct SignatureVerifier.SignatureProtection |  |
| venueInfo | struct VenueInfo | Venue payload. Only the fields listed above are signed. |

### checkCustomerInfo

```solidity
function checkCustomerInfo(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, struct CustomerInfo customerInfo, struct VenueRules rules) external view
```

Verifies customer payment payload and enforces venue rule compatibility.

_Hash covers: `paymentInUSDtoken`, `visitBountyAmount`, `spendBountyPercentage`,
     `customer`, `venueToPayFor`, `promoter`, `amount`, and `chainId`. Uses `abi.encode`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address |  |
| protection | struct SignatureVerifier.SignatureProtection |  |
| customerInfo | struct CustomerInfo | Customer payment data. Only the fields listed above are signed. |
| rules | struct VenueRules | Venue rules against which to validate payment and bounty types. |

### _encodeBounties

```solidity
function _encodeBounties(struct Bounties bounties) internal view returns (bytes)
```

### checkPromoterPaymentDistribution

```solidity
function checkPromoterPaymentDistribution(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, struct PromoterInfo promoterInfo) external view
```

Verifies promoter payout distribution payload.

_Hash covers: `promoter`, `venue`, `amountInUSD`, and `chainId`. Uses `abi.encode`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address |  |
| protection | struct SignatureVerifier.SignatureProtection |  |
| promoterInfo | struct PromoterInfo | Payout details. Only the fields listed above are signed. |

### checkDynamicPriceParameters

```solidity
function checkDynamicPriceParameters(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, address receiver, struct DynamicPriceParameters params) external view
```

Verifies dynamic price mint parameters for a given receiver.

_Requires `block.timestamp <= params.deadline`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address | The contract address the signature is bound to (typically `address(this)`). |
| protection | struct SignatureVerifier.SignatureProtection |  |
| receiver | address | Address that will receive the minted token(s). |
| params | struct DynamicPriceParameters | Dynamic price payload. |

### checkStaticPriceParameters

```solidity
function checkStaticPriceParameters(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, address receiver, struct StaticPriceParameters params) internal view
```

Verifies static price mint parameters for a given receiver.

_Requires `block.timestamp <= params.deadline`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address | The contract address the signature is bound to (typically `address(this)`). |
| protection | struct SignatureVerifier.SignatureProtection |  |
| receiver | address | Address that will receive the minted token(s). |
| params | struct StaticPriceParameters | Static price payload. |

### _checkBountiesPayment

```solidity
function _checkBountiesPayment(struct Bounties bounties, struct VenueRules rules) internal pure returns (enum BountyTypes bountyType)
```

