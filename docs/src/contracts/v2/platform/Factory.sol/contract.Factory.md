# Factory
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/platform/Factory.sol)

**Inherits:**
Initializable, Ownable, [ReferralSystemV2](/contracts/v2/platform/extensions/ReferralSystemV2.sol/abstract.ReferralSystemV2.md)

**Title:**
NFT Factory Contract

Produces upgradeable ERC721-like AccessToken collections, minimal-proxy ERC1155 CreditToken collections, and
vesting wallets while configuring royalties receivers and referral parameters for the Belong platform.


- Uses Solady's `LibClone` helpers for deterministic CREATE2 deployments and ERC1967 proxies.
- Creation flows are gated by signatures produced by `FactoryParameters.signerAddress` (see {SignatureVerifier}).
- Royalties are split between creator/platform/referral receivers via {RoyaltiesReceiverV2}.
- Referral percentages and bookkeeping stem from {ReferralSystemV2}.


## State Variables
### _nftFactoryParameters
Current factory parameters.


```solidity
FactoryParameters private _nftFactoryParameters
```


### getNftInstanceInfo
Mapping `(name, symbol)` hash → AccessToken collection info.


```solidity
mapping(bytes32 hashedNameSymbol => NftInstanceInfo info) public getNftInstanceInfo
```


### _creditTokenInstanceInfo
Mapping `(name, symbol)` hash → CreditToken collection info.


```solidity
mapping(bytes32 hashedNameSymbol => CreditTokenInstanceInfo info) private _creditTokenInstanceInfo
```


### _vestingWalletInstanceInfos
Mapping `beneficiary` → list of vesting wallets deployed for that beneficiary.


```solidity
mapping(address beneficiary => VestingWalletInstanceInfo[] infos) private _vestingWalletInstanceInfos
```


### _royaltiesParameters
Current royalties split parameters.


```solidity
RoyaltiesParameters private _royaltiesParameters
```


### _currentImplementations
Current implementation addresses used by the factory.


```solidity
Implementations private _currentImplementations
```


## Functions
### constructor

Disable initializers on the implementation.

**Note:**
oz-upgrades-unsafe-allow: constructor


```solidity
constructor() ;
```

### initialize

Initializes factory settings and referral parameters; sets the initial owner.

Must be called exactly once on the proxy instance.


```solidity
function initialize(
    FactoryParameters calldata factoryParameters,
    RoyaltiesParameters calldata _royalties,
    Implementations calldata _implementations,
    uint16[5] calldata percentages,
    uint16 maxArrayLength
) external initializer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`factoryParameters`|`FactoryParameters`|Factory parameters (fee collector, signer, defaults, etc.).|
|`_royalties`|`RoyaltiesParameters`|Royalties split (creator/platform) in BPS.|
|`_implementations`|`Implementations`|Implementation addresses for deployments.|
|`percentages`|`uint16[5]`|Referral percentages array forwarded to {ReferralSystemV2}.|
|`maxArrayLength`|`uint16`||


### upgradeToV2

Upgrades stored royalties parameters and implementation addresses (reinitializer v2).


```solidity
function upgradeToV2(
    RoyaltiesParameters calldata _royalties,
    Implementations calldata _implementations,
    uint16[5] calldata percentages,
    uint16 maxArrayLength
) external reinitializer(2);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_royalties`|`RoyaltiesParameters`|New royalties parameters (BPS).|
|`_implementations`|`Implementations`|New implementation addresses.|
|`percentages`|`uint16[5]`||
|`maxArrayLength`|`uint16`||


### produce

Produces a new AccessToken collection (upgradeable proxy) and optional RoyaltiesReceiver.


- Validates `accessTokenInfo` via platform signer (EIP-712/ECDSA inside `SignatureVerifier`).
- Deterministic salt is `keccak256(name, symbol)`. Creation fails if the salt already exists.
- If `feeNumerator > 0`, deploys a RoyaltiesReceiver and wires creator/platform/referral receivers.
- Uses `deployDeterministicERC1967` for AccessToken proxy and `cloneDeterministic` for royalties receiver.


```solidity
function produce(
    AccessTokenInfo memory accessTokenInfo,
    bytes32 referralCode,
    SignatureVerifier.SignatureProtection calldata protection
) external returns (address nftAddress, address receiver);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`accessTokenInfo`|`AccessTokenInfo`|Parameters used to initialize the AccessToken instance.|
|`referralCode`|`bytes32`|Optional referral code attributed to the creator.|
|`protection`|`SignatureVerifier.SignatureProtection`||

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`nftAddress`|`address`|The deployed AccessToken proxy address.|
|`receiver`|`address`||


### produceCreditToken

Produces a new CreditToken (ERC1155) collection as a minimal proxy clone.


- Validates `creditTokenInfo` via platform signer and provided `signature`.
- Deterministic salt is `keccak256(name, symbol)`. Creation fails if the salt already exists.
- Uses `cloneDeterministic` and then initializes the cloned instance.


```solidity
function produceCreditToken(
    ERC1155Info calldata creditTokenInfo,
    SignatureVerifier.SignatureProtection calldata protection
) external returns (address creditToken);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`creditTokenInfo`|`ERC1155Info`|Parameters to initialize the CreditToken instance.|
|`protection`|`SignatureVerifier.SignatureProtection`||

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`creditToken`|`address`|The deployed CreditToken clone address.|


### deployVestingWallet

Deploys and funds a VestingWallet proxy with a validated schedule.


- Validates signer authorization via {SignatureVerifier.checkVestingWalletInfo}.
- Requires caller to hold at least `totalAllocation` of the vesting token.
- Allows pure step-based vesting when `durationSeconds == 0` and `linearAllocation == 0`.
- Deterministic salt is `keccak256(beneficiary, walletIndex)` where `walletIndex` is the beneficiary's wallet count.
- Transfers `totalAllocation` from caller to the newly deployed vesting wallet.


```solidity
function deployVestingWallet(
    address _owner,
    VestingWalletInfo calldata vestingWalletInfo,
    SignatureVerifier.SignatureProtection calldata protection
) external returns (address vestingWallet);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_owner`|`address`|Owner address for the vesting wallet proxy.|
|`vestingWalletInfo`|`VestingWalletInfo`|Full vesting configuration and description.|
|`protection`|`SignatureVerifier.SignatureProtection`||

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`vestingWallet`|`address`|The deployed VestingWallet proxy address.|


### setFactoryParameters

Updates factory parameters, royalties, implementations, and referral percentages.

Only callable by the owner (backend/admin).


```solidity
function setFactoryParameters(
    FactoryParameters calldata factoryParameters_,
    RoyaltiesParameters calldata _royalties,
    Implementations calldata _implementations,
    uint16[5] calldata percentages,
    uint16 maxArrayLength
) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`factoryParameters_`|`FactoryParameters`|New factory parameters.|
|`_royalties`|`RoyaltiesParameters`|New royalties parameters (BPS).|
|`_implementations`|`Implementations`|New implementation addresses.|
|`percentages`|`uint16[5]`|Referral percentages propagated to {ReferralSystemV2}.|
|`maxArrayLength`|`uint16`||


### nftFactoryParameters

Returns the current factory parameters.


```solidity
function nftFactoryParameters() external view returns (FactoryParameters memory);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`FactoryParameters`|The [FactoryParameters](/contracts/v2/platform/Factory.sol/contract.Factory.md#factoryparameters) struct.|


### royaltiesParameters

Returns the current royalties parameters (BPS).


```solidity
function royaltiesParameters() external view returns (RoyaltiesParameters memory);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`RoyaltiesParameters`|The [RoyaltiesParameters](/contracts/v2/platform/Factory.sol/contract.Factory.md#royaltiesparameters) struct.|


### implementations

Returns the current implementation addresses used for deployments.


```solidity
function implementations() external view returns (Implementations memory);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`Implementations`|The [Implementations](/contracts/v2/platform/Factory.sol/contract.Factory.md#implementations) struct.|


### nftInstanceInfo

Returns stored info for an AccessToken collection by `(name, symbol)`.


```solidity
function nftInstanceInfo(string calldata name, string calldata symbol)
    external
    view
    returns (NftInstanceInfo memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`name`|`string`|Collection name.|
|`symbol`|`string`|Collection symbol.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`NftInstanceInfo`|The {NftInstanceInfo} record, if created.|


### getCreditTokenInstanceInfo

Returns stored info for a CreditToken collection by `(name, symbol)`.


```solidity
function getCreditTokenInstanceInfo(string calldata name, string calldata symbol)
    external
    view
    returns (CreditTokenInstanceInfo memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`name`|`string`|Collection name.|
|`symbol`|`string`|Collection symbol.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`CreditTokenInstanceInfo`|The [CreditTokenInstanceInfo](/contracts/v2/platform/Factory.sol/contract.Factory.md#credittokeninstanceinfo) record, if created.|


### getVestingWalletInstanceInfo

Returns a vesting wallet record for `beneficiary` at `index`.


```solidity
function getVestingWalletInstanceInfo(address beneficiary, uint256 index)
    external
    view
    returns (VestingWalletInstanceInfo memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`beneficiary`|`address`|Wallet beneficiary supplied during deployment.|
|`index`|`uint256`|Position inside the beneficiary's vesting wallet array.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`VestingWalletInstanceInfo`|The [VestingWalletInstanceInfo](/contracts/v2/platform/Factory.sol/contract.Factory.md#vestingwalletinstanceinfo) record at the requested index.|


### getVestingWalletInstanceInfos

Returns all vesting wallet records registered for `beneficiary`.


```solidity
function getVestingWalletInstanceInfos(address beneficiary)
    external
    view
    returns (VestingWalletInstanceInfo[] memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`beneficiary`|`address`|Wallet beneficiary supplied during deployment.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`VestingWalletInstanceInfo[]`|Array of [VestingWalletInstanceInfo](/contracts/v2/platform/Factory.sol/contract.Factory.md#vestingwalletinstanceinfo) records.|


### _setFactoryParameters

Internal helper to atomically set factory, royalties, and implementation parameters.

Reverts if royalties sum exceeds 100% (10_000 BPS).


```solidity
function _setFactoryParameters(
    FactoryParameters memory factoryParameters_,
    RoyaltiesParameters calldata _royalties,
    Implementations calldata _implementations
) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`factoryParameters_`|`FactoryParameters`|New factory parameters.|
|`_royalties`|`RoyaltiesParameters`|New royalties parameters (BPS).|
|`_implementations`|`Implementations`|New implementation addresses.|


### _getHash

Computes a deterministic salt for a collection metadata pair.


```solidity
function _getHash(bytes memory valueA, bytes memory valueB) private view returns (bytes32);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`valueA`|`bytes`|Collection name.|
|`valueB`|`bytes`|Collection symbol.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes32`|Salt equal to `keccak256(abi.encode(name, symbol))`.|


## Events
### AccessTokenCreated
Emitted after successful creation of an AccessToken collection.


```solidity
event AccessTokenCreated(bytes32 indexed _hash, NftInstanceInfo info);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_hash`|`bytes32`|Keccak256 hash of `(name, symbol)`.|
|`info`|`NftInstanceInfo`|Deployed collection details.|

### CreditTokenCreated
Emitted after successful creation of a CreditToken collection.


```solidity
event CreditTokenCreated(bytes32 indexed _hash, CreditTokenInstanceInfo info);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_hash`|`bytes32`|Keccak256 hash of `(name, symbol)`.|
|`info`|`CreditTokenInstanceInfo`|Deployed collection details.|

### VestingWalletCreated
Emitted after successful deployment and funding of a VestingWallet.


```solidity
event VestingWalletCreated(bytes32 indexed _hash, VestingWalletInstanceInfo info);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_hash`|`bytes32`|Keccak256 hash of `(beneficiary, walletIndex)` used as deterministic salt.|
|`info`|`VestingWalletInstanceInfo`|Deployed vesting details.|

### FactoryParametersSet
Emitted when factory/global parameters are updated.


```solidity
event FactoryParametersSet(
    FactoryParameters factoryParameters, RoyaltiesParameters royalties, Implementations implementations
);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`factoryParameters`|`FactoryParameters`|New factory parameters.|
|`royalties`|`RoyaltiesParameters`|New royalties parameters (creator/platform BPS).|
|`implementations`|`Implementations`|Addresses for implementation contracts.|

## Errors
### TokenAlreadyExists
Thrown when a collection with the same `(name, symbol)` already exists.


```solidity
error TokenAlreadyExists();
```

### VestingWalletAlreadyExists
Thrown when a beneficiary already has a vesting wallet registered.


```solidity
error VestingWalletAlreadyExists();
```

### TotalRoyaltiesNot100Percent
Thrown when `amountToCreator + amountToPlatform != 10000`.


```solidity
error TotalRoyaltiesNot100Percent();
```

### RoyaltiesReceiverAddressMismatch
Thrown when the deployed royalties receiver address does not match the predicted CREATE2 address.


```solidity
error RoyaltiesReceiverAddressMismatch();
```

### AccessTokenAddressMismatch
Thrown when the deployed AccessToken proxy address does not match the predicted address.


```solidity
error AccessTokenAddressMismatch();
```

### CreditTokenAddressMismatch
Thrown when the deployed CreditToken address does not match the predicted address.


```solidity
error CreditTokenAddressMismatch();
```

### VestingWalletAddressMismatch
Thrown when the deployed VestingWallet proxy address does not match the predicted address.


```solidity
error VestingWalletAddressMismatch();
```

### NotEnoughFundsToVest
Thrown when the caller does not hold enough tokens to fully fund the vesting wallet.


```solidity
error NotEnoughFundsToVest();
```

### BadDurations
Invalid combination of `durationSeconds` and `cliffDurationSeconds`.


```solidity
error BadDurations(uint64 duration, uint64 cliff);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`duration`|`uint64`|Provided linear duration in seconds.|
|`cliff`|`uint64`|Provided cliff duration in seconds.|

### AllocationMismatch
Current allocation sum does not fit under `totalAllocation`.


```solidity
error AllocationMismatch(uint256 total);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`total`|`uint256`|Provided total allocation.|

## Structs
### FactoryParameters
Global configuration knobs consumed by factory deployments and downstream contracts.

`platformCommission` is expressed in basis points (BPS), where 10_000 == 100%.


```solidity
struct FactoryParameters {
    /// @notice Address that collects platform fees/commissions.
    address platformAddress;
    /// @notice EOA/contract whose signature authorizes creation requests.
    address signerAddress;
    /// @notice Default payment token used when none specified by caller.
    address defaultPaymentCurrency;
    /// @notice Platform commission in BPS.
    uint256 platformCommission;
    /// @notice Maximum permissible array length for batched operations (guardrail).
    uint256 maxArraySize;
    /// @notice Transfer validator contract address injected into AccessToken instances.
    address transferValidator;
}
```

### CreditTokenInstanceInfo
Summary information about a deployed CreditToken collection.


```solidity
struct CreditTokenInstanceInfo {
    /// @notice Deployed CreditToken (minimal proxy) address.
    address creditToken;
    /// @notice Collection name.
    string name;
    /// @notice Collection symbol.
    string symbol;
}
```

### VestingWalletInstanceInfo

```solidity
struct VestingWalletInstanceInfo {
    /// @notice Vesting start timestamp (TGE).
    uint64 startTimestamp;
    /// @notice Cliff duration in seconds (linear section begins at `start + cliff`).
    uint64 cliffDurationSeconds;
    /// @notice Linear vesting duration in seconds counted from `cliff`.
    uint64 durationSeconds;
    /// @notice ERC-20 token vested by this wallet.
    address token;
    /// @notice Deployed VestingWallet (ERC1967 proxy) address.
    address vestingWallet;
    /// @notice Human-readable description supplied by the backend for off-chain bookkeeping.
    string description;
}
```

### RoyaltiesParameters
Royalties split configuration for secondary sales.

Values are in BPS (10_000 == 100%). Sum must not exceed 10_000.


```solidity
struct RoyaltiesParameters {
    uint16 amountToCreator;
    uint16 amountToPlatform;
}
```

### Implementations
Implementation contract addresses used for deployments.


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

