# Solidity API

## NftInstanceInfo

Summary information about a deployed AccessToken collection.

```solidity
struct NftInstanceInfo {
  address creator;
  address nftAddress;
  address royaltiesReceiver;
  struct NftMetadata metadata;
}
```

## Factory

Produces upgradeable ERC721-like AccessToken collections, minimal-proxy ERC1155 CreditToken collections, and
        vesting wallets while configuring royalties receivers and referral parameters for the Belong platform.
@dev
- Uses Solady's `LibClone` helpers for deterministic CREATE2 deployments and ERC1967 proxies.
- Creation flows are gated by signatures produced by `FactoryParameters.signerAddress` (see {SignatureVerifier}).
- Royalties are split between creator/platform/referral receivers via {RoyaltiesReceiverV2}.
- Referral percentages and bookkeeping stem from {ReferralSystemV2}.

### TokenAlreadyExists

```solidity
error TokenAlreadyExists()
```

Thrown when a collection with the same `(name, symbol)` already exists.

### VestingWalletAlreadyExists

```solidity
error VestingWalletAlreadyExists()
```

Thrown when a beneficiary already has a vesting wallet registered.

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

### VestingWalletAddressMismatch

```solidity
error VestingWalletAddressMismatch()
```

Thrown when the deployed VestingWallet proxy address does not match the predicted address.

### NotEnoughFundsToVest

```solidity
error NotEnoughFundsToVest()
```

Thrown when the caller does not hold enough tokens to fully fund the vesting wallet.

### BadDurations

```solidity
error BadDurations(uint64 duration, uint64 cliff)
```

Invalid combination of `durationSeconds` and `cliffDurationSeconds`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| duration | uint64 | Provided linear duration in seconds. |
| cliff | uint64 | Provided cliff duration in seconds. |

### AllocationMismatch

```solidity
error AllocationMismatch(uint256 currentAllocation, uint256 total)
```

Current allocation sum does not fit under `totalAllocation`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currentAllocation | uint256 | Sum of TGE and linear allocation. |
| total | uint256 | Provided total allocation. |

### AccessTokenCreated

```solidity
event AccessTokenCreated(bytes32 _hash, struct NftInstanceInfo info)
```

Emitted after successful creation of an AccessToken collection.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _hash | bytes32 | Keccak256 hash of `(name, symbol)`. |
| info | struct NftInstanceInfo | Deployed collection details. |

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

### VestingWalletCreated

```solidity
event VestingWalletCreated(bytes32 _hash, struct Factory.VestingWalletInstanceInfo info)
```

Emitted after successful deployment and funding of a VestingWallet.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _hash | bytes32 | Keccak256 hash of `(beneficiary, walletIndex)` used as deterministic salt. |
| info | struct Factory.VestingWalletInstanceInfo | Deployed vesting details. |

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

Global configuration knobs consumed by factory deployments and downstream contracts.

_`platformCommission` is expressed in basis points (BPS), where 10_000 == 100%._

```solidity
struct FactoryParameters {
  address platformAddress;
  address signerAddress;
  address defaultPaymentCurrency;
  uint256 platformCommission;
  uint256 maxArraySize;
  address transferValidator;
}
```

### CreditTokenInstanceInfo

Summary information about a deployed CreditToken collection.

```solidity
struct CreditTokenInstanceInfo {
  address creditToken;
  string name;
  string symbol;
}
```

### VestingWalletInstanceInfo

```solidity
struct VestingWalletInstanceInfo {
  uint64 startTimestamp;
  uint64 cliffDurationSeconds;
  uint64 durationSeconds;
  address token;
  address vestingWallet;
  string description;
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
- `nftAddress` is an ERC1967 implementation for proxy deployments (Upgradeable).
- `creditToken` and `royaltiesReceiver` are minimal-proxy (clone) targets.

```solidity
struct Implementations {
  address accessToken;
  address creditToken;
  address royaltiesReceiver;
  address vestingWallet;
}
```

### getNftInstanceInfo

```solidity
mapping(bytes32 => struct NftInstanceInfo) getNftInstanceInfo
```

Mapping `(name, symbol)` hash → AccessToken collection info.

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

### upgradeToV2

```solidity
function upgradeToV2(struct Factory.RoyaltiesParameters _royalties, struct Factory.Implementations _implementations) external
```

Upgrades stored royalties parameters and implementation addresses (reinitializer v2).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _royalties | struct Factory.RoyaltiesParameters | New royalties parameters (BPS). |
| _implementations | struct Factory.Implementations | New implementation addresses. |

### produce

```solidity
function produce(struct AccessTokenInfo accessTokenInfo, bytes32 referralCode) external returns (address nftAddress)
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
| nftAddress | address | The deployed AccessToken proxy address. |

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

### deployVestingWallet

```solidity
function deployVestingWallet(address _owner, struct VestingWalletInfo vestingWalletInfo, bytes signature) external returns (address vestingWallet)
```

Deploys and funds a VestingWallet proxy with a validated schedule.
@dev
- Validates signer authorization via {SignatureVerifier.checkVestingWalletInfo}.
- Requires caller to hold at least `totalAllocation` of the vesting token.
- Allows pure step-based vesting when `durationSeconds == 0` and `linearAllocation == 0`.
- Deterministic salt is `keccak256(beneficiary, walletIndex)` where `walletIndex` is the beneficiary's wallet count.
- Transfers `totalAllocation` from caller to the newly deployed vesting wallet.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | Owner address for the vesting wallet proxy. |
| vestingWalletInfo | struct VestingWalletInfo | Full vesting configuration and description. |
| signature | bytes | Signature from platform signer validating `_owner` and `vestingWalletInfo`. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| vestingWallet | address | The deployed VestingWallet proxy address. |

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

### nftInstanceInfo

```solidity
function nftInstanceInfo(string name, string symbol) external view returns (struct NftInstanceInfo)
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
| [0] | struct NftInstanceInfo | The {NftInstanceInfo} record, if created. |

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

### getVestingWalletInstanceInfo

```solidity
function getVestingWalletInstanceInfo(address beneficiary, uint256 index) external view returns (struct Factory.VestingWalletInstanceInfo)
```

Returns a vesting wallet record for `beneficiary` at `index`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| beneficiary | address | Wallet beneficiary supplied during deployment. |
| index | uint256 | Position inside the beneficiary's vesting wallet array. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct Factory.VestingWalletInstanceInfo | The {VestingWalletInstanceInfo} record at the requested index. |

### getVestingWalletInstanceInfos

```solidity
function getVestingWalletInstanceInfos(address beneficiary, uint256 index) external view returns (struct Factory.VestingWalletInstanceInfo[])
```

Returns all vesting wallet records registered for `beneficiary`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| beneficiary | address | Wallet beneficiary supplied during deployment. |
| index | uint256 | Legacy parameter kept for ABI compatibility (unused). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct Factory.VestingWalletInstanceInfo[] | Array of {VestingWalletInstanceInfo} records. |

