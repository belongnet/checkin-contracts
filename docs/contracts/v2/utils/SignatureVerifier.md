# Solidity API

## SignatureVerifier

Stateless helpers to verify backend-signed payloads for collection creation,
        credit token creation, vesting wallet deployment, venue/customer/promoter actions,
        and mint parameter checks.
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

_Hash covers: `name`, `symbol`, `contractURI`, `feeNumerator`, and `chainId`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| accessTokenInfo | struct AccessTokenInfo | Payload to verify. Only the fields listed above are signed. |

### checkCreditTokenInfo

```solidity
function checkCreditTokenInfo(address signer, bytes signature, struct ERC1155Info creditTokenInfo) external view
```

Verifies CreditToken (ERC1155) collection creation payload.

_Hash covers: `name`, `symbol`, `uri`, and `chainId`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| signature | bytes | Detached signature validating `creditTokenInfo`. |
| creditTokenInfo | struct ERC1155Info | Payload. Only the fields listed above are signed. |

### checkVestingWalletInfo

```solidity
function checkVestingWalletInfo(address signer, bytes signature, address owner, struct VestingWalletInfo vestingWalletInfo) external view
```

Verifies VestingWallet deployment payload including owner and schedule parameters.

_Hash covers: `owner`, `startTimestamp`, `cliffDurationSeconds`, `durationSeconds`,
     `token`, `beneficiary`, `totalAllocation`, `tgeAmount`, `linearAllocation`, `description`, and `chainId`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| signature | bytes | Detached signature validating `vestingWalletInfo` and `_owner`. |
| owner | address | Owner address for the vesting wallet proxy. |
| vestingWalletInfo | struct VestingWalletInfo | Full vesting schedule configuration and metadata. |

### checkVenueInfo

```solidity
function checkVenueInfo(address signer, struct VenueInfo venueInfo) external view
```

Verifies venue deposit intent and metadata.

_Hash covers: `venue`, `referralCode`, `uri`, and `chainId`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| venueInfo | struct VenueInfo | Venue payload. Only the fields listed above are signed. |

### checkCustomerInfo

```solidity
function checkCustomerInfo(address signer, struct CustomerInfo customerInfo, struct VenueRules rules) external view
```

Verifies customer payment payload and enforces venue rule compatibility.

_Hash covers: `paymentInUSDC`, `visitBountyAmount`, `spendBountyPercentage`,
     `customer`, `venueToPayFor`, `promoter`, `amount`, and `chainId`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| customerInfo | struct CustomerInfo | Customer payment data. Only the fields listed above are signed. |
| rules | struct VenueRules | Venue rules against which to validate payment and bounty types. |

### checkPromoterPaymentDistribution

```solidity
function checkPromoterPaymentDistribution(address signer, struct PromoterInfo promoterInfo) external view
```

Verifies promoter payout distribution payload.

_Hash covers: `promoter`, `venue`, `amountInUSD`, and `chainId`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| promoterInfo | struct PromoterInfo | Payout details. Only the fields listed above are signed. |

### checkDynamicPriceParameters

```solidity
function checkDynamicPriceParameters(address signer, address receiver, struct DynamicPriceParameters params) external view
```

Verifies dynamic price mint parameters for a given receiver.

_Hash covers: `receiver`, `tokenId`, `tokenUri`, `price`, and `chainId`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| receiver | address | Address that will receive the minted token(s). |
| params | struct DynamicPriceParameters | Dynamic price payload. |

### checkStaticPriceParameters

```solidity
function checkStaticPriceParameters(address signer, address receiver, struct StaticPriceParameters params) external view
```

Verifies static price mint parameters for a given receiver.

_Hash covers: `receiver`, `tokenId`, `tokenUri`, `whitelisted`, and `chainId`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | Authorized signer address. |
| receiver | address | Address that will receive the minted token(s). |
| params | struct StaticPriceParameters | Static price payload. |

