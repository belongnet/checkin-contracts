# Solidity API

## SignatureVerifier

Stateless helpers to verify backend-signed payloads for collection creation,
        credit token creation, vesting wallet deployment, venue/customer/promoter actions,
        and mint parameter checks.
@dev
- Uses `SignatureCheckerLib.isValidSignatureNow` for EOA or ERC1271 signatures.
- All hashes include `block.chainid` to bind signatures to a specific chain.
- Uses `abi.encode` for collision-safe hashing of multiple dynamic fields.
- Every digest starts with a message-kind type hash, so a signature issued for one kind of action
  can never be accepted for another (for example a static-price mint as a dynamic-price mint).
- Every digest is bound to the verifying contract and includes `nonce` and `deadline`.
- Payload structs are encoded whole (`abi.encode(struct)`), so every field of the payload is signed.
- This library is stateless. The Factory and BelongCheckIn verifiers return the verified digest so that
  the integrating contract can record it and reject a second use (`usedSignatures`).

### SignatureProtection

```solidity
struct SignatureProtection {
  uint256 nonce;
  uint256 deadline;
  bytes signature;
}
```

### ACCESS_TOKEN_INFO_TYPEHASH

```solidity
bytes32 ACCESS_TOKEN_INFO_TYPEHASH
```

First word of an AccessToken creation digest.

### CREDIT_TOKEN_INFO_TYPEHASH

```solidity
bytes32 CREDIT_TOKEN_INFO_TYPEHASH
```

First word of a CreditToken creation digest.

### VESTING_WALLET_INFO_TYPEHASH

```solidity
bytes32 VESTING_WALLET_INFO_TYPEHASH
```

First word of a VestingWallet deployment digest.

### VENUE_INFO_TYPEHASH

```solidity
bytes32 VENUE_INFO_TYPEHASH
```

First word of a venue deposit digest.

### CUSTOMER_INFO_TYPEHASH

```solidity
bytes32 CUSTOMER_INFO_TYPEHASH
```

First word of a customer payment digest.

### PROMOTER_INFO_TYPEHASH

```solidity
bytes32 PROMOTER_INFO_TYPEHASH
```

First word of a promoter payout digest.

### STATIC_PRICE_MINT_TYPEHASH

```solidity
bytes32 STATIC_PRICE_MINT_TYPEHASH
```

First word of a static-price mint digest.

### DYNAMIC_PRICE_MINT_TYPEHASH

```solidity
bytes32 DYNAMIC_PRICE_MINT_TYPEHASH
```

First word of a dynamic-price mint digest.

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
function checkAccessTokenInfo(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, struct AccessTokenInfo accessTokenInfo, bytes32 referralCode) external view returns (bytes32 digest)
```

Verifies an AccessToken collection creation payload.

_Signed digest:
     `keccak256(abi.encode(ACCESS_TOKEN_INFO_TYPEHASH, verifyingContract, nonce, deadline, block.chainid,
     accessTokenInfo, referralCode))`.
     The whole `AccessTokenInfo` struct is encoded, so the creator, payment token, royalty, transferability,
     supply cap, prices, metadata and contract URI are all bound, together with the referral code._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address | The contract address the signature is bound to (typically `address(this)`). |
| protection | struct SignatureVerifier.SignatureProtection | Signature payload with `nonce`, `deadline`, and signer signature. |
| accessTokenInfo | struct AccessTokenInfo | Payload to verify, exactly as supplied by the caller. |
| referralCode | bytes32 | Referral code the collection is created with (zero when none). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| digest | bytes32 | The verified digest, so the caller can record it as used. |

### checkCreditTokenInfo

```solidity
function checkCreditTokenInfo(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, struct ERC1155Info creditTokenInfo) external view returns (bytes32 digest)
```

Verifies a CreditToken (ERC1155) collection creation payload.

_Signed digest:
     `keccak256(abi.encode(CREDIT_TOKEN_INFO_TYPEHASH, verifyingContract, nonce, deadline, block.chainid,
     creditTokenInfo))`.
     The whole `ERC1155Info` struct is encoded, so the admin, manager, minter and burner addresses and the
     transferability flag are bound together with the name, symbol and URI._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address | The contract address the signature is bound to (typically `address(this)`). |
| protection | struct SignatureVerifier.SignatureProtection | Signature payload with `nonce`, `deadline`, and signer signature. |
| creditTokenInfo | struct ERC1155Info | Payload to verify, exactly as supplied by the caller. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| digest | bytes32 | The verified digest, so the caller can record it as used. |

### checkVestingWalletInfo

```solidity
function checkVestingWalletInfo(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, address owner, struct VestingWalletInfo vestingWalletInfo, uint256 initialFunding) external view returns (bytes32 digest)
```

Verifies a VestingWallet deployment payload including owner, schedule and initial funding.

_Signed digest:
     `keccak256(abi.encode(VESTING_WALLET_INFO_TYPEHASH, verifyingContract, nonce, deadline, block.chainid,
     owner, vestingWalletInfo, initialFunding))`.
     The whole `VestingWalletInfo` struct is encoded (description included), together with the amount the
     caller funds the wallet with on deployment. A signature therefore authorizes one exact deployment and
     cannot be spent by a third party on an unfunded or relabelled wallet._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address | The contract address the signature is bound to (typically `address(this)`). |
| protection | struct SignatureVerifier.SignatureProtection | Signature payload with `nonce`, `deadline`, and signer signature. |
| owner | address | Intended vesting wallet owner. |
| vestingWalletInfo | struct VestingWalletInfo | Full vesting schedule configuration and metadata, exactly as supplied by the caller. |
| initialFunding | uint256 | Amount transferred from the caller to the wallet on deployment. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| digest | bytes32 | The verified digest, so the caller can record it as used. |

### checkVenueInfo

```solidity
function checkVenueInfo(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, struct VenueInfo venueInfo) external view returns (bytes32 digest)
```

Verifies a venue deposit payload.

_Signed digest:
     `keccak256(abi.encode(VENUE_INFO_TYPEHASH, verifyingContract, nonce, deadline, block.chainid, venueInfo))`.
     The whole `VenueInfo` struct is encoded, so the venue, deposit amount, venue rules, affiliate referral
     code and URI are all bound._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address | The contract address the signature is bound to (typically `address(this)`). |
| protection | struct SignatureVerifier.SignatureProtection | Signature payload with `nonce`, `deadline`, and signer signature. |
| venueInfo | struct VenueInfo | Venue payload, exactly as supplied by the caller. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| digest | bytes32 | The verified digest, so the caller can record it as used. |

### checkCustomerInfo

```solidity
function checkCustomerInfo(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, struct CustomerInfo customerInfo, struct VenueRules rules) external view returns (bytes32 digest)
```

Verifies a customer payment payload and enforces venue rule compatibility.

_Signed digest:
     `keccak256(abi.encode(CUSTOMER_INFO_TYPEHASH, verifyingContract, nonce, deadline, block.chainid,
     rules.bountyType, rules.bountyAllocationType, customerInfo))`.
     The whole `CustomerInfo` struct is encoded, and the venue's current bounty rules are bound as well, so a
     signature stops being valid when the venue changes those rules._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address | The contract address the signature is bound to (typically `address(this)`). |
| protection | struct SignatureVerifier.SignatureProtection | Signature payload with `nonce`, `deadline`, and signer signature. |
| customerInfo | struct CustomerInfo | Customer payment data, exactly as supplied by the caller. |
| rules | struct VenueRules | Venue rules against which to validate payment and bounty types. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| digest | bytes32 | The verified digest, so the caller can record it as used. |

### checkPromoterPaymentDistribution

```solidity
function checkPromoterPaymentDistribution(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, struct PromoterInfo promoterInfo) external view returns (bytes32 digest)
```

Verifies a promoter payout distribution payload.

_Signed digest:
     `keccak256(abi.encode(PROMOTER_INFO_TYPEHASH, verifyingContract, nonce, deadline, block.chainid,
     promoterInfo))`.
     The whole `PromoterInfo` struct is encoded, so the payout currency flag is bound together with the
     promoter referral code, venue and amount._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address | The contract address the signature is bound to (typically `address(this)`). |
| protection | struct SignatureVerifier.SignatureProtection | Signature payload with `nonce`, `deadline`, and signer signature. |
| promoterInfo | struct PromoterInfo | Payout details, exactly as supplied by the caller. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| digest | bytes32 | The verified digest, so the caller can record it as used. |

### checkDynamicPriceParameters

```solidity
function checkDynamicPriceParameters(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, address receiver, struct DynamicPriceParameters params) external view
```

Verifies dynamic price mint parameters for a given receiver.

_Signed digest:
     `keccak256(abi.encode(DYNAMIC_PRICE_MINT_TYPEHASH, verifyingContract, nonce, deadline, block.chainid,
     receiver, tokenId, tokenUri, price))`.
     The type hash keeps this digest distinct from a static-price mint digest, whose last word is a boolean._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address | The contract address the signature is bound to (typically `address(this)`). |
| protection | struct SignatureVerifier.SignatureProtection | Signature payload with `nonce`, `deadline`, and signer signature. |
| receiver | address | Address that will receive the minted token(s). |
| params | struct DynamicPriceParameters | Dynamic price payload. |

### checkStaticPriceParameters

```solidity
function checkStaticPriceParameters(address signer, address verifyingContract, struct SignatureVerifier.SignatureProtection protection, address receiver, struct StaticPriceParameters params) internal view
```

Verifies static price mint parameters for a given receiver.

_Signed digest:
     `keccak256(abi.encode(STATIC_PRICE_MINT_TYPEHASH, verifyingContract, nonce, deadline, block.chainid,
     receiver, tokenId, tokenUri, whitelisted))`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| verifyingContract | address | The contract address the signature is bound to (typically `address(this)`). |
| protection | struct SignatureVerifier.SignatureProtection | Signature payload with `nonce`, `deadline`, and signer signature. |
| receiver | address | Address that will receive the minted token(s). |
| params | struct StaticPriceParameters | Static price payload. |

### _checkBountiesPayment

```solidity
function _checkBountiesPayment(struct Bounties bounties, struct VenueRules rules) internal pure returns (enum BountyTypes bountyType)
```

