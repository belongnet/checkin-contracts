# Solidity API

## SignatureVerifier

Stateless helpers to verify backend-signed payloads for collection creation,
        credit token creation, venue/customer/promoter actions, and mint parameter checks.
@dev
- Uses `SignatureCheckerLib.isValidSignatureNow` for EOA or ERC1271 signatures.
- All hashes include `block.chainid` to bind signatures to a specific chain.
- Reverts with explicit errors on invalid signatures or rule mismatches.

### InvalidSignature

```solidity
error InvalidSignature()
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

### WrongBountyType

```solidity
error WrongBountyType()
```

Thrown when the bounty type derived from customer payload conflicts with venue rules.

### checkAccessTokenInfo

```solidity
function checkAccessTokenInfo(address signer, struct AccessTokenInfo accessTokenInfo) external view
```

Verifies AccessToken collection creation payload.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| accessTokenInfo | struct AccessTokenInfo | Payload to verify (name, symbol, contractURI, feeNumerator, signature). |

### checkCreditTokenInfo

```solidity
function checkCreditTokenInfo(address signer, bytes signature, struct ERC1155Info creditTokenInfo) external view
```

Verifies CreditToken (ERC1155) collection creation payload.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| signature | bytes | Detached signature validating `creditTokenInfo`. |
| creditTokenInfo | struct ERC1155Info | Payload (name, symbol, uri, roles). |

### checkVenueInfo

```solidity
function checkVenueInfo(address signer, struct VenueInfo venueInfo) external view
```

Verifies venue deposit intent and parameters.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| venueInfo | struct VenueInfo | Venue payload (venue, referral, uri). |

### checkCustomerInfo

```solidity
function checkCustomerInfo(address signer, struct CustomerInfo customerInfo, struct VenueRules rules) external view
```

Verifies customer payment payload and enforces venue rule compatibility.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| customerInfo | struct CustomerInfo | Customer payment data (currency flags, bounties, actors, amount). |
| rules | struct VenueRules | Venue rules against which to validate payment/bounty types. |

### checkPromoterPaymentDistribution

```solidity
function checkPromoterPaymentDistribution(address signer, struct PromoterInfo promoterInfo) external view
```

Verifies promoter payout distribution payload.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| promoterInfo | struct PromoterInfo | Payout details to be validated. |

### checkDynamicPriceParameters

```solidity
function checkDynamicPriceParameters(address signer, address receiver, struct DynamicPriceParameters params) external view
```

Verifies dynamic price mint parameters for a given receiver.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| receiver | address | Address that will receive the minted token(s). |
| params | struct DynamicPriceParameters | Dynamic price payload (id, uri, price, signature). |

### checkStaticPriceParameters

```solidity
function checkStaticPriceParameters(address signer, address receiver, struct StaticPriceParameters params) external view
```

Verifies static price mint parameters for a given receiver.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| receiver | address | Address that will receive the minted token(s). |
| params | struct StaticPriceParameters | Static price payload (id, uri, whitelist flag, signature). |

