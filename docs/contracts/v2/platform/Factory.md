# Solidity API

## Factory

Produces upgradeable ERC721-like AccessToken collections and minimal-proxy ERC1155 CreditToken collections,
        configures royalties receivers, and manages platform referral parameters.
@dev
- Uses Solady's `LibClone` for CREATE2 deterministic deployments and ERC1967 proxy deployments.
- Signature-gated creation flows validated by a platform signer (see {FactoryParameters.signer}).
- Royalties split (creator/platform/referral) configured via `RoyaltiesReceiverV2`.
- Referral configuration inherited from {ReferralSystemV2}.

### TokenAlreadyExists

```solidity
error TokenAlreadyExists()
```

Thrown when a collection with the same `(name, symbol)` already exists.

### TotalRoyaltiesExceed100Pecents

```solidity
error TotalRoyaltiesExceed100Pecents()
```

Thrown when `amountToCreator + amountToPlatform > 10000` (i.e., >100% in BPS).

### RoyaltiesReceiverAddressMismatch

```solidity
error RoyaltiesReceiverAddressMismatch()
```

Thrown when the deployed royalties receiver address does not match the predicted CREATE2 address.

### AccessTokenAddressMismatch

```solidity
error AccessTokenAddressMismatch()
```

Thrown when the deployed AccessToken proxy address does not match the predicted address.

### CreditTokenAddressMismatch

```solidity
error CreditTokenAddressMismatch()
```

Thrown when the deployed CreditToken address does not match the predicted address.

### AccessTokenCreated

```solidity
event AccessTokenCreated(bytes32 _hash, struct Factory.AccessTokenInstanceInfo info)
```

Emitted after successful creation of an AccessToken collection.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _hash | bytes32 | Keccak256 hash of `(name, symbol)`. |
| info | struct Factory.AccessTokenInstanceInfo | Deployed collection details. |

### CreditTokenCreated

```solidity
event CreditTokenCreated(bytes32 _hash, struct Factory.CreditTokenInstanceInfo info)
```

Emitted after successful creation of a CreditToken collection.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _hash | bytes32 | Keccak256 hash of `(name, symbol)`. |
| info | struct Factory.CreditTokenInstanceInfo | Deployed collection details. |

### FactoryParametersSet

```solidity
event FactoryParametersSet(struct Factory.FactoryParameters factoryParameters, struct Factory.RoyaltiesParameters royalties, struct Factory.Implementations implementations)
```

Emitted when factory/global parameters are updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| factoryParameters | struct Factory.FactoryParameters | New factory parameters. |
| royalties | struct Factory.RoyaltiesParameters | New royalties parameters (creator/platform BPS). |
| implementations | struct Factory.Implementations | Addresses for implementation contracts. |

### FactoryParameters

Global configuration for the Factory.

_`commissionInBps` is expressed in basis points (BPS), where 10_000 == 100%._

```solidity
struct FactoryParameters {
  address feeCollector;
  address signer;
  address defaultPaymentToken;
  uint256 commissionInBps;
  uint256 maxArraySize;
  address transferValidator;
}
```

### AccessTokenInstanceInfo

Summary information about a deployed AccessToken collection.

```solidity
struct AccessTokenInstanceInfo {
  address creator;
  address accessToken;
  address royaltiesReceiver;
  string name;
  string symbol;
}
```

### CreditTokenInstanceInfo

Summary information about a deployed CreditToken collection.

```solidity
struct CreditTokenInstanceInfo {
  address defaultAdmin;
  address manager;
  address minter;
  address burner;
  address creditToken;
  string name;
  string symbol;
}
```

### RoyaltiesParameters

Royalties split configuration for secondary sales.

_Values are in BPS (10_000 == 100%). Sum must not exceed 10_000._

```solidity
struct RoyaltiesParameters {
  uint16 amountToCreator;
  uint16 amountToPlatform;
}
```

### Implementations

Implementation contract addresses used for deployments.
@dev
- `accessToken` is an ERC1967 implementation for proxy deployments (Upgradeable).
- `creditToken` and `royaltiesReceiver` are minimal-proxy (clone) targets.

```solidity
struct Implementations {
  address accessToken;
  address creditToken;
  address royaltiesReceiver;
}
```

### constructor

```solidity
constructor() public
```

Disable initializers on the implementation.

### initialize

```solidity
function initialize(struct Factory.FactoryParameters factoryParameters, struct Factory.RoyaltiesParameters _royalties, struct Factory.Implementations _implementations, uint16[5] percentages) external
```

Initializes factory settings and referral parameters; sets the initial owner.

_Must be called exactly once on the proxy instance._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| factoryParameters | struct Factory.FactoryParameters | Factory parameters (fee collector, signer, defaults, etc.). |
| _royalties | struct Factory.RoyaltiesParameters | Royalties split (creator/platform) in BPS. |
| _implementations | struct Factory.Implementations | Implementation addresses for deployments. |
| percentages | uint16[5] | Referral percentages array forwarded to {ReferralSystemV2}. |

### produce

```solidity
function produce(struct AccessTokenInfo accessTokenInfo, bytes32 referralCode) external returns (address accessToken)
```

Produces a new AccessToken collection (upgradeable proxy) and optional RoyaltiesReceiver.
@dev
- Validates `accessTokenInfo` via platform signer (EIP-712/ECDSA inside `SignatureVerifier`).
- Deterministic salt is `keccak256(name, symbol)`. Creation fails if the salt already exists.
- If `feeNumerator > 0`, deploys a RoyaltiesReceiver and wires creator/platform/referral receivers.
- Uses `deployDeterministicERC1967` for AccessToken proxy and `cloneDeterministic` for royalties receiver.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| accessTokenInfo | struct AccessTokenInfo | Parameters used to initialize the AccessToken instance. |
| referralCode | bytes32 | Optional referral code attributed to the creator. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| accessToken | address | The deployed AccessToken proxy address. |

### produceCreditToken

```solidity
function produceCreditToken(struct ERC1155Info creditTokenInfo, bytes signature) external returns (address creditToken)
```

Produces a new CreditToken (ERC1155) collection as a minimal proxy clone.
@dev
- Validates `creditTokenInfo` via platform signer and provided `signature`.
- Deterministic salt is `keccak256(name, symbol)`. Creation fails if the salt already exists.
- Uses `cloneDeterministic` and then initializes the cloned instance.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| creditTokenInfo | struct ERC1155Info | Parameters to initialize the CreditToken instance. |
| signature | bytes | Authorization signature from the platform signer. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| creditToken | address | The deployed CreditToken clone address. |

### setFactoryParameters

```solidity
function setFactoryParameters(struct Factory.FactoryParameters factoryParameters_, struct Factory.RoyaltiesParameters _royalties, struct Factory.Implementations _implementations, uint16[5] percentages) external
```

Updates factory parameters, royalties, implementations, and referral percentages.

_Only callable by the owner (backend/admin)._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| factoryParameters_ | struct Factory.FactoryParameters | New factory parameters. |
| _royalties | struct Factory.RoyaltiesParameters | New royalties parameters (BPS). |
| _implementations | struct Factory.Implementations | New implementation addresses. |
| percentages | uint16[5] | Referral percentages propagated to {ReferralSystemV2}. |

### nftFactoryParameters

```solidity
function nftFactoryParameters() external view returns (struct Factory.FactoryParameters)
```

Returns the current factory parameters.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct Factory.FactoryParameters | The {FactoryParameters} struct. |

### royaltiesParameters

```solidity
function royaltiesParameters() external view returns (struct Factory.RoyaltiesParameters)
```

Returns the current royalties parameters (BPS).

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct Factory.RoyaltiesParameters | The {RoyaltiesParameters} struct. |

### implementations

```solidity
function implementations() external view returns (struct Factory.Implementations)
```

Returns the current implementation addresses used for deployments.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct Factory.Implementations | The {Implementations} struct. |

### getNftInstanceInfo

```solidity
function getNftInstanceInfo(string name, string symbol) external view returns (struct Factory.AccessTokenInstanceInfo)
```

Returns stored info for an AccessToken collection by `(name, symbol)`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| name | string | Collection name. |
| symbol | string | Collection symbol. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct Factory.AccessTokenInstanceInfo | The {AccessTokenInstanceInfo} record, if created. |

### getCreditTokenInstanceInfo

```solidity
function getCreditTokenInstanceInfo(string name, string symbol) external view returns (struct Factory.CreditTokenInstanceInfo)
```

Returns stored info for a CreditToken collection by `(name, symbol)`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| name | string | Collection name. |
| symbol | string | Collection symbol. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct Factory.CreditTokenInstanceInfo | The {CreditTokenInstanceInfo} record, if created. |

