# SignatureVerifier
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/utils/SignatureVerifier.sol)

**Title:**
SignatureVerifier

Stateless helpers to verify backend-signed payloads for collection creation,
credit token creation, vesting wallet deployment, venue/customer/promoter actions,
and mint parameter checks.


- Uses `SignatureCheckerLib.isValidSignatureNow` for EOA or ERC1271 signatures.
- All hashes include `block.chainid` to bind signatures to a specific chain.
- Uses `abi.encode` for collision-safe hashing of multiple dynamic fields.
- Mint digests are bound to the specific verifying contract, include `nonce` and `deadline`,
and hash dynamic strings with `keccak256(bytes(...))` to avoid ambiguity.


## State Variables
### _SECP256K1N_HALF

```solidity
uint256 private constant _SECP256K1N_HALF = 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0
```


### _EIP2098_S_MASK

```solidity
bytes32 private constant _EIP2098_S_MASK = 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
```


## Functions
### checkAccessTokenInfo

Verifies AccessToken collection creation payload.

Hash covers: `name`, `symbol`, `contractURI`, `feeNumerator`, and `chainId`.
Uses `abi.encode` to prevent collisions on multiple dynamic fields.


```solidity
function checkAccessTokenInfo(
    address signer,
    address verifyingContract,
    SignatureProtection calldata protection,
    AccessTokenInfo calldata accessTokenInfo
) external view;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`signer`|`address`|Authorized signer address.|
|`verifyingContract`|`address`||
|`protection`|`SignatureProtection`||
|`accessTokenInfo`|`AccessTokenInfo`|Payload to verify. Only the fields listed above are signed.|


### checkCreditTokenInfo

Verifies CreditToken (ERC1155) collection creation payload.

Hash covers: `name`, `symbol`, `uri`, and `chainId`.
Uses `abi.encode` to avoid packed collisions.


```solidity
function checkCreditTokenInfo(
    address signer,
    address verifyingContract,
    SignatureProtection calldata protection,
    ERC1155Info calldata creditTokenInfo
) external view;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`signer`|`address`|Authorized signer address.|
|`verifyingContract`|`address`||
|`protection`|`SignatureProtection`||
|`creditTokenInfo`|`ERC1155Info`|Payload. Only the fields listed above are signed.|


### checkVestingWalletInfo

Verifies VestingWallet deployment payload including owner and schedule parameters.

Hash covers: `owner`, `startTimestamp`, `cliffDurationSeconds`, `durationSeconds`,
`token`, `beneficiary`, `totalAllocation`, `tgeAmount`, `linearAllocation`, `description`, and `chainId`.
Uses `abi.encode` (not packed).


```solidity
function checkVestingWalletInfo(
    address signer,
    address verifyingContract,
    SignatureProtection calldata protection,
    address owner,
    VestingWalletInfo calldata vestingWalletInfo
) external view;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`signer`|`address`|Authorized signer address.|
|`verifyingContract`|`address`||
|`protection`|`SignatureProtection`||
|`owner`|`address`||
|`vestingWalletInfo`|`VestingWalletInfo`|Full vesting schedule configuration and metadata.|


### checkVenueInfo

Verifies venue deposit intent and metadata.

Hash covers: `venue`, `referralCode`, `uri`, and `chainId`. Uses `abi.encode`.


```solidity
function checkVenueInfo(
    address signer,
    address verifyingContract,
    SignatureProtection calldata protection,
    VenueInfo calldata venueInfo
) external view;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`signer`|`address`|Authorized signer address.|
|`verifyingContract`|`address`||
|`protection`|`SignatureProtection`||
|`venueInfo`|`VenueInfo`|Venue payload. Only the fields listed above are signed.|


### checkCustomerInfo

Verifies customer payment payload and enforces venue rule compatibility.

Hash covers: `paymentInUSDtoken`, `visitBountyAmount`, `spendBountyPercentage`,
`customer`, `venueToPayFor`, `promoter`, `amount`, and `chainId`. Uses `abi.encode`.


```solidity
function checkCustomerInfo(
    address signer,
    address verifyingContract,
    SignatureProtection calldata protection,
    CustomerInfo calldata customerInfo,
    VenueRules calldata rules
) external view;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`signer`|`address`|Authorized signer address.|
|`verifyingContract`|`address`||
|`protection`|`SignatureProtection`||
|`customerInfo`|`CustomerInfo`|Customer payment data. Only the fields listed above are signed.|
|`rules`|`VenueRules`|Venue rules against which to validate payment and bounty types.|


### _encodeBounties


```solidity
function _encodeBounties(Bounties calldata bounties) internal view returns (bytes memory);
```

### checkPromoterPaymentDistribution

Verifies promoter payout distribution payload.

Hash covers: `promoter`, `venue`, `amountInUSD`, and `chainId`. Uses `abi.encode`.


```solidity
function checkPromoterPaymentDistribution(
    address signer,
    address verifyingContract,
    SignatureProtection calldata protection,
    PromoterInfo calldata promoterInfo
) external view;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`signer`|`address`|Authorized signer address.|
|`verifyingContract`|`address`||
|`protection`|`SignatureProtection`||
|`promoterInfo`|`PromoterInfo`|Payout details. Only the fields listed above are signed.|


### checkDynamicPriceParameters

Verifies dynamic price mint parameters for a given receiver.

Requires `block.timestamp <= params.deadline`.


```solidity
function checkDynamicPriceParameters(
    address signer,
    address verifyingContract,
    SignatureProtection calldata protection,
    address receiver,
    DynamicPriceParameters calldata params
) external view;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`signer`|`address`|Authorized signer address.|
|`verifyingContract`|`address`|The contract address the signature is bound to (typically `address(this)`).|
|`protection`|`SignatureProtection`||
|`receiver`|`address`|Address that will receive the minted token(s).|
|`params`|`DynamicPriceParameters`|Dynamic price payload.|


### checkStaticPriceParameters

Verifies static price mint parameters for a given receiver.

Requires `block.timestamp <= params.deadline`.


```solidity
function checkStaticPriceParameters(
    address signer,
    address verifyingContract,
    SignatureProtection calldata protection,
    address receiver,
    StaticPriceParameters calldata params
) internal view;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`signer`|`address`|Authorized signer address.|
|`verifyingContract`|`address`|The contract address the signature is bound to (typically `address(this)`).|
|`protection`|`SignatureProtection`||
|`receiver`|`address`|Address that will receive the minted token(s).|
|`params`|`StaticPriceParameters`|Static price payload.|


### _checkBountiesPayment


```solidity
function _checkBountiesPayment(Bounties calldata bounties, VenueRules calldata rules)
    internal
    pure
    returns (BountyTypes bountyType);
```

### _validateProtection


```solidity
function _validateProtection(SignatureProtection calldata protection) private view;
```

### _enforceCanonicalSignature


```solidity
function _enforceCanonicalSignature(bytes memory signature) private pure;
```

## Errors
### InvalidSignature
Thrown when a signature does not match the expected signer/payload.


```solidity
error InvalidSignature(bytes signature);
```

### EmptyMetadata
Thrown when collection metadata (name/symbol) is empty.


```solidity
error EmptyMetadata(string name, string symbol);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`name`|`string`|The provided collection name.|
|`symbol`|`string`|The provided collection symbol.|

### WrongPaymentType
Thrown when the customer's requested payment type conflicts with venue rules.


```solidity
error WrongPaymentType();
```

### EmptyReferralCode
Thrown when the bounty type derived from customer payload conflicts with venue rules.


```solidity
error EmptyReferralCode();
```

### NoBountiesRelated

```solidity
error NoBountiesRelated();
```

### NoBountyAllocationTypeSpecified

```solidity
error NoBountyAllocationTypeSpecified();
```

### WrongCustomerBountyType

```solidity
error WrongCustomerBountyType();
```

### SignatureExpired
Thrown when a signed payload is past its deadline.


```solidity
error SignatureExpired();
```

## Structs
### SignatureProtection

```solidity
struct SignatureProtection {
    uint256 nonce;
    uint256 deadline;
    bytes signature;
}
```

