# Solidity API

## VestingWalletExtended

Token vesting wallet supporting TGE, linear vesting after cliff, and step-based tranches.
@dev
- Vesting consists of three parts: one-off TGE at `start`, linear vesting after `cliff`,
  and optional monotonic time-ordered tranches between `start` and `end`.
- Tranche configuration must be finalized so that TGE + linear allocation + tranches
  exactly equals `totalAllocation` before any release.
- Inherits UUPS upgradeability and Solady's `Ownable`/`Initializable`.

### ZeroAddressPassed

```solidity
error ZeroAddressPassed()
```

A zero address was provided where a valid address is required.

### NothingToRelease

```solidity
error NothingToRelease()
```

There is no vested amount available to release at this time.

### TrancheBeforeStart

```solidity
error TrancheBeforeStart(uint64 timestamp)
```

Attempted to add a tranche with timestamp prior to vesting start.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| timestamp | uint64 | The invalid tranche timestamp. |

### VestingFinalized

```solidity
error VestingFinalized()
```

Tranche configuration has already been finalized and can no longer be modified.

### VestingNotFinalized

```solidity
error VestingNotFinalized()
```

Tranche configuration is not finalized yet; operation requires finalization.

### NonMonotonic

```solidity
error NonMonotonic(uint64 timestamp)
```

Tranche timestamps must be non-decreasing.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| timestamp | uint64 | The non-monotonic timestamp encountered. |

### TrancheAfterEnd

```solidity
error TrancheAfterEnd(uint64 timestamp)
```

Attempted to add a tranche with timestamp after vesting end.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| timestamp | uint64 | The invalid tranche timestamp. |

### AllocationNotBalanced

```solidity
error AllocationNotBalanced(uint256 currentAllocation, uint256 totalAllocation)
```

Sum of TGE + linear + tranches does not equal total allocation.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currentAllocation | uint256 | The computed current allocation sum. |
| totalAllocation | uint256 | The expected total allocation. |

### OverAllocation

```solidity
error OverAllocation(uint256 currentAllocation, uint256 totalAllocation)
```

Sum of TGE + linear + tranches exceeds total allocation.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currentAllocation | uint256 | The computed current allocation sum. |
| totalAllocation | uint256 | The expected total allocation. |

### Released

```solidity
event Released(address token, uint256 amount)
```

Emitted when tokens are released to the beneficiary.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The ERC-20 token address released. |
| amount | uint256 | The amount of token released. |

### TrancheAdded

```solidity
event TrancheAdded(struct VestingWalletExtended.Tranche tranche)
```

Emitted when a tranche is added.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tranche | struct VestingWalletExtended.Tranche | The tranche added. |

### Finalized

```solidity
event Finalized(uint256 timestamp)
```

Emitted when tranche configuration becomes immutable.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| timestamp | uint256 | The block timestamp when finalized. |

### Tranche

A step-based vesting tranche becoming fully vested at `timestamp`.

```solidity
struct Tranche {
  uint64 timestamp;
  uint192 amount;
}
```

### tranchesConfigurationFinalized

```solidity
bool tranchesConfigurationFinalized
```

Whether tranche configuration has been finalized.

### released

```solidity
uint256 released
```

The total amount already released to the beneficiary.

### tranchesTotal

```solidity
uint256 tranchesTotal
```

The sum of all tranche amounts (Σ tranche.amount).

### tranches

```solidity
struct VestingWalletExtended.Tranche[] tranches
```

The configured tranches in non-decreasing timestamp order.

### vestingStorage

```solidity
struct VestingWalletInfo vestingStorage
```

Vesting parameters and metadata.

### vestingNotFinalized

```solidity
modifier vestingNotFinalized()
```

_Reverts if tranche configuration has already been finalized._

### shouldBeFinalized

```solidity
modifier shouldBeFinalized()
```

_Reverts if tranche configuration is not finalized yet._

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(address _owner, struct VestingWalletInfo vestingParams) external
```

Initializes the vesting wallet with the given owner and vesting parameters.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | Address that will become the contract owner. |
| vestingParams | struct VestingWalletInfo | Full vesting configuration (TGE, cliff, linear, tranches metadata). |

### addTranche

```solidity
function addTranche(struct VestingWalletExtended.Tranche tranche) external
```

Adds a single step-based tranche.
@dev
- Requires timestamp to be within [start, end] and not earlier than the last tranche.
- Updates `tranchesTotal` and emits {TrancheAdded}.
- Reverts if adding this tranche causes overallocation.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tranche | struct VestingWalletExtended.Tranche | The tranche to add. |

### addTranches

```solidity
function addTranches(struct VestingWalletExtended.Tranche[] tranchesArray) external
```

Adds multiple step-based tranches in one call.
@dev
- Validates each tranche is within [start, end] and the sequence is non-decreasing.
- Sums amounts to check against `totalAllocation` to prevent overallocation.
- Emits {TrancheAdded} for each tranche.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tranchesArray | struct VestingWalletExtended.Tranche[] | The array of tranches to add (must be time-ordered or equal). |

### finalizeTranchesConfiguration

```solidity
function finalizeTranchesConfiguration() external
```

Finalizes tranche configuration; makes vesting schedule immutable.

_Ensures TGE + linear + tranches equals `totalAllocation` before finalization._

### release

```solidity
function release() external
```

Releases all currently vested, unreleased tokens to the beneficiary.

_Computes `min(vestedAmount(now) - released, tokenBalance)` and transfers that amount._

### vestedAmount

```solidity
function vestedAmount(uint64 timestamp) public view returns (uint256 total)
```

Returns the total vested amount by a given timestamp.

_Sums TGE (if past start), all fully vested tranches by `timestamp`, and linear portion after `cliff`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| timestamp | uint64 | The timestamp to evaluate vesting at (seconds since epoch). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| total | uint256 | The total amount vested by `timestamp`. |

### releasable

```solidity
function releasable() public view returns (uint256)
```

Returns the currently releasable amount (capped by current wallet balance).

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The amount that can be released at the current block timestamp. |

### description

```solidity
function description() public view returns (string)
```

Human-readable vesting description.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | The description string stored in vesting parameters. |

### start

```solidity
function start() public view returns (uint64)
```

Vesting start timestamp (TGE).

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | The start timestamp. |

### cliff

```solidity
function cliff() public view returns (uint64)
```

Vesting cliff timestamp (`start` + `cliffDurationSeconds`).

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | The cliff timestamp. |

### duration

```solidity
function duration() public view returns (uint64)
```

Linear vesting duration in seconds.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | The linear duration. |

### end

```solidity
function end() public view returns (uint64)
```

Vesting end timestamp (`cliff` + `duration`).

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint64 | The end timestamp. |

### tranchesLength

```solidity
function tranchesLength() external view returns (uint256)
```

Number of configured tranches.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The length of the `tranches` array. |

### _authorizeUpgrade

```solidity
function _authorizeUpgrade(address) internal
```

Authorizes UUPS upgrades; restricted to owner.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
|  | address |  |
