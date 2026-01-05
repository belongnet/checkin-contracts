# VestingWalletExtended
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/periphery/VestingWalletExtended.sol)

**Inherits:**
Initializable, UUPSUpgradeable, Ownable

**Title:**
VestingWalletExtended

Token vesting wallet supporting TGE, linear vesting after cliff, and step-based tranches.


- Vesting consists of three parts: one-off TGE at `start`, linear vesting after `cliff`,
and optional monotonic time-ordered tranches between `start` and `end`.
- Tranche configuration must be finalized so that TGE + linear allocation + tranches
exactly equals `totalAllocation` before any release.
- Inherits UUPS upgradeability and Solady's `Ownable`/`Initializable`.


## State Variables
### tranchesConfigurationFinalized
Whether tranche configuration has been finalized.


```solidity
bool public tranchesConfigurationFinalized
```


### released
The total amount already released to the beneficiary.


```solidity
uint256 public released
```


### tranchesTotal
The sum of all tranche amounts (Σ tranche.amount).


```solidity
uint256 public tranchesTotal
```


### tranches
The configured tranches in non-decreasing timestamp order.


```solidity
Tranche[] public tranches
```


### vestingStorage
Vesting parameters and metadata.


```solidity
VestingWalletInfo public vestingStorage
```


## Functions
### vestingNotFinalized

Reverts if tranche configuration has already been finalized.


```solidity
modifier vestingNotFinalized() ;
```

### shouldBeFinalized

Reverts if tranche configuration is not finalized yet.


```solidity
modifier shouldBeFinalized() ;
```

### constructor

**Note:**
oz-upgrades-unsafe-allow: constructor


```solidity
constructor() ;
```

### initialize

Initializes the vesting wallet with the given owner and vesting parameters.


```solidity
function initialize(address _owner, VestingWalletInfo calldata vestingParams) external initializer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_owner`|`address`|Address that will become the contract owner.|
|`vestingParams`|`VestingWalletInfo`|Full vesting configuration (TGE, cliff, linear, tranches metadata).|


### addTranche

Adds a single step-based tranche.


- Requires timestamp to be within [start, end] and not earlier than the last tranche.
- Updates `tranchesTotal` and emits [TrancheAdded](/contracts/v2/periphery/VestingWalletExtended.sol/contract.VestingWalletExtended.md#trancheadded).
- Reverts if adding this tranche causes overallocation.


```solidity
function addTranche(Tranche calldata tranche) external onlyOwner vestingNotFinalized;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tranche`|`Tranche`|The tranche to add.|


### addTranches

Adds multiple step-based tranches in one call.


- Validates each tranche is within [start, end] and the sequence is non-decreasing.
- Sums amounts to check against `totalAllocation` to prevent overallocation.
- Emits [TrancheAdded](/contracts/v2/periphery/VestingWalletExtended.sol/contract.VestingWalletExtended.md#trancheadded) for each tranche.


```solidity
function addTranches(Tranche[] calldata tranchesArray) external onlyOwner vestingNotFinalized;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tranchesArray`|`Tranche[]`|The array of tranches to add (must be time-ordered or equal).|


### finalizeTranchesConfiguration

Finalizes tranche configuration; makes vesting schedule immutable.

Ensures TGE + linear + tranches equals `totalAllocation` before finalization.


```solidity
function finalizeTranchesConfiguration() external onlyOwner vestingNotFinalized;
```

### release

Releases all currently vested, unreleased tokens to the beneficiary.

Computes `vestedAmount(now) - released` and transfers that delta.

**Note:**
reverts: NothingToRelease If there is no amount to release.


```solidity
function release() external shouldBeFinalized;
```

### vestedAmount

Returns the total vested amount by a given timestamp.

Sums TGE (if past start), all fully vested tranches by `timestamp`, and linear portion after `cliff`.


```solidity
function vestedAmount(uint64 timestamp) public view returns (uint256 total);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`timestamp`|`uint64`|The timestamp to evaluate vesting at (seconds since epoch).|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`total`|`uint256`|The total amount vested by `timestamp`.|


### releasable

Returns the currently releasable amount (vested minus already released).


```solidity
function releasable() public view returns (uint256);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The amount that can be released at the current block timestamp.|


### description

Human-readable vesting description.


```solidity
function description() public view returns (string memory);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`string`|The description string stored in vesting parameters.|


### start

Vesting start timestamp (TGE).


```solidity
function start() public view returns (uint64);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint64`|The start timestamp.|


### cliff

Vesting cliff timestamp (`start` + `cliffDurationSeconds`).


```solidity
function cliff() public view returns (uint64);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint64`|The cliff timestamp.|


### duration

Linear vesting duration in seconds.


```solidity
function duration() public view returns (uint64);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint64`|The linear duration.|


### end

Vesting end timestamp (`cliff` + `duration`).


```solidity
function end() public view returns (uint64);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint64`|The end timestamp.|


### tranchesLength

Number of configured tranches.


```solidity
function tranchesLength() external view returns (uint256);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The length of the `tranches` array.|


### _authorizeUpgrade

Authorizes UUPS upgrades; restricted to owner.


```solidity
function _authorizeUpgrade(
    address /*newImplementation*/
)
    internal
    override
    onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address`||


## Events
### Released
Emitted when tokens are released to the beneficiary.


```solidity
event Released(address indexed token, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The ERC-20 token address released.|
|`amount`|`uint256`|The amount of token released.|

### TrancheAdded
Emitted when a tranche is added.


```solidity
event TrancheAdded(Tranche tranche);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tranche`|`Tranche`|The tranche added.|

### Finalized
Emitted when tranche configuration becomes immutable.


```solidity
event Finalized(uint256 timestamp);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`timestamp`|`uint256`|The block timestamp when finalized.|

## Errors
### ZeroAddressPassed
A zero address was provided where a valid address is required.


```solidity
error ZeroAddressPassed();
```

### NothingToRelease
There is no vested amount available to release at this time.


```solidity
error NothingToRelease();
```

### TrancheBeforeStart
Attempted to add a tranche with timestamp prior to vesting start.


```solidity
error TrancheBeforeStart(uint64 timestamp);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`timestamp`|`uint64`|The invalid tranche timestamp.|

### VestingFinalized
Tranche configuration has already been finalized and can no longer be modified.


```solidity
error VestingFinalized();
```

### VestingNotFinalized
Tranche configuration is not finalized yet; operation requires finalization.


```solidity
error VestingNotFinalized();
```

### NonMonotonic
Tranche timestamps must be non-decreasing.


```solidity
error NonMonotonic(uint64 timestamp);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`timestamp`|`uint64`|The non-monotonic timestamp encountered.|

### TrancheAfterEnd
Attempted to add a tranche with timestamp after vesting end.


```solidity
error TrancheAfterEnd(uint64 timestamp);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`timestamp`|`uint64`|The invalid tranche timestamp.|

### AllocationNotBalanced
Sum of TGE + linear + tranches does not equal total allocation.


```solidity
error AllocationNotBalanced(uint256 currentAllocation, uint256 totalAllocation);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`currentAllocation`|`uint256`|The computed current allocation sum.|
|`totalAllocation`|`uint256`|The expected total allocation.|

### OverAllocation
Sum of TGE + linear + tranches exceeds total allocation.


```solidity
error OverAllocation(uint256 currentAllocation, uint256 totalAllocation);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`currentAllocation`|`uint256`|The computed current allocation sum.|
|`totalAllocation`|`uint256`|The expected total allocation.|

## Structs
### Tranche
A step-based vesting tranche becoming fully vested at `timestamp`.


```solidity
struct Tranche {
    /// @notice Unlock timestamp (UTC, seconds since epoch) when `amount` becomes vested.
    uint64 timestamp;
    /// @notice Amount vested at `timestamp`.
    uint192 amount;
}
```

