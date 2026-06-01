# Solidity API

## Staking

ERC4626-compatible staking vault for the LONG token with time-locks,
        linearly streamed owner-funded rewards that vest into the share price,
        and an emergency withdrawal path with a configurable penalty.
@dev
- Uses share-based locks to remain correct under reward streaming that changes the exchange rate over time.
- Emergency flow burns shares and pays out `assets - penalty`, transferring penalty to `treasury`.
- Owner can configure the minimum stake period and penalty percentage.
- Underlying asset address is returned by {asset()} and is immutable after construction.

### MinStakePeriodShouldBeGreaterThanZero

```solidity
error MinStakePeriodShouldBeGreaterThanZero()
```

Reverts when attempting to set a zero minimum stake period.

### MinStakePeriodNotMet

```solidity
error MinStakePeriodNotMet()
```

Reverts when a withdrawal is attempted but locked shares remain.

### PenaltyTooHigh

```solidity
error PenaltyTooHigh()
```

Reverts when the penalty percentage exceeds the scaling factor (100%).

### ZeroReward

```solidity
error ZeroReward()
```

Reverts when a zero-amount reward distribution is attempted.

### SharesEqZero

```solidity
error SharesEqZero()
```

Reverts when a zero shares is attempted.

### TooManyStakeEntries

```solidity
error TooManyStakeEntries()
```

Reverts when attempting to create more stake entries than allowed.

### RewardDurationShouldBeGreaterThanZero

```solidity
error RewardDurationShouldBeGreaterThanZero()
```

Reverts when attempting to use a zero reward duration.

### RewardRateZero

```solidity
error RewardRateZero()
```

Reverts when reward rate would be zero for a scheduled distribution.

### MinStakePeriodSet

```solidity
event MinStakePeriodSet(uint256 period)
```

Emitted when the minimum stake period is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| period | uint256 | New minimum stake period in seconds. |

### PenaltyPercentSet

```solidity
event PenaltyPercentSet(uint256 percent)
```

Emitted when the penalty percentage is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| percent | uint256 | New penalty percentage scaled by {SCALING_FACTOR}. |

### RewardDurationSet

```solidity
event RewardDurationSet(uint256 duration)
```

Emitted when the reward duration is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| duration | uint256 | New reward duration in seconds. |

### TreasurySet

```solidity
event TreasurySet(address treasury)
```

Emitted when the treasury address is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| treasury | address | New treasury address. |

### RewardsDistributed

```solidity
event RewardsDistributed(uint256 amount, uint256 duration, uint256 rewardRate)
```

Emitted when rewards are scheduled for linear distribution.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Amount of LONG transferred in as rewards. |
| duration | uint256 | Duration over which rewards vest linearly. |
| rewardRate | uint256 | Tokens vested per second. |

### RewardsVested

```solidity
event RewardsVested(uint256 amount)
```

Emitted when rewards are vested (unlocked) during state-changing operations.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Amount of LONG unlocked from the reward stream. |

### EmergencyWithdraw

```solidity
event EmergencyWithdraw(address by, address to, address owner, uint256 assets, uint256 shares)
```

Emitted for emergency withdrawals that burn shares and apply penalty.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| by | address | Caller that triggered the emergency operation. |
| to | address | Recipient of the post-penalty payout. |
| owner | address | Owner whose shares were burned. |
| assets | uint256 | Assets transferred to the recipient after penalty. |
| shares | uint256 | Amount of shares burned. |

### Config

Records locked staking positions in shares to remain rebase-safe.

_`shares` represent ERC4626 shares minted on deposit; lock expires at `timestamp + minStakePeriod`._

```solidity
struct Config {
  address LONG;
  address treasury;
  uint256 minStakePeriod;
  uint256 penaltyPercentage;
}
```

### Rewards

Reward emission parameters for linear vesting of owner-supplied rewards.

```solidity
struct Rewards {
  uint256 duration;
  uint256 rate;
  uint256 periodFinish;
  uint256 lastUpdate;
  uint256 locked;
}
```

### Stake

```solidity
struct Stake {
  uint256 shares;
  uint256 lockUntil;
}
```

### SCALING_FACTOR

```solidity
uint256 SCALING_FACTOR
```

Percentage scaling factor where 10_000 equals 100%.

### MAX_STAKE_ENTRIES

```solidity
uint256 MAX_STAKE_ENTRIES
```

Maximum number of active stake entries allowed per staker to prevent unbounded gas usage.

### stakes

```solidity
mapping(address => struct Staking.Stake[]) stakes
```

User stake entries stored as arrays per staker.

_Public getter: `stakes(user, i)` → `(shares, timestamp)`._

### unlockedStakes

```solidity
mapping(address => uint256) unlockedStakes
```

Aggregates shares whose lock period elapsed to avoid bloated stake arrays.

### rewards

```solidity
struct Staking.Rewards rewards
```

### config

```solidity
struct Staking.Config config
```

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(address _owner, address _treasury, address long) external
```

Initializes the staking vault.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | Address to be set as the owner. |
| _treasury | address | Treasury address to receive emergency penalties. |
| long | address | Address of the LONG ERC20 token (underlying asset). |

### setMinStakePeriod

```solidity
function setMinStakePeriod(uint256 period) external
```

Sets the minimum stake period.

_Reverts if `period == 0`.
     Applies only to future stakes; existing `lockUntil` values remain unchanged._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| period | uint256 | New minimum stake period in seconds. |

### setPenaltyPercentage

```solidity
function setPenaltyPercentage(uint256 newPercent) external
```

Sets the emergency penalty percentage.

_Reverts if `newPercent > SCALING_FACTOR` (i.e., > 100%)._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newPercent | uint256 | New penalty percentage scaled by {SCALING_FACTOR}. |

### setTreasury

```solidity
function setTreasury(address _treasury) external
```

Updates the treasury address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _treasury | address | New treasury address. |

### setRewardsDuration

```solidity
function setRewardsDuration(uint256 duration) external
```

Sets the duration (in seconds) over which rewards vest linearly.

_Reverts if `duration == 0`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| duration | uint256 | Reward vesting duration. |

### distributeRewards

```solidity
function distributeRewards(uint256 amount) external
```

Enqueues rewards that vest linearly over {rewardsDuration}.

_Caller must approve this contract to pull `amount` LONG beforehand._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Amount of LONG to stream as rewards (must be > 0). |

### emergencyWithdraw

```solidity
function emergencyWithdraw(uint256 assets, address to, address _owner) external returns (uint256 payout)
```

Emergency path to withdraw a target `assets` amount for `_owner`, paying to `to`.
@dev
- Reverts if `assets > maxWithdraw(_owner)`.
- Burns the corresponding `shares`, applies penalty to locked portions, and returns the post-penalty payout.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Target assets to withdraw (pre-penalty). |
| to | address | Recipient of the post-penalty payout. |
| _owner | address | Share owner whose position will be reduced. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| payout | uint256 | Assets actually transferred to `to` after penalties. |

### emergencyRedeem

```solidity
function emergencyRedeem(uint256 shares, address to, address _owner) external returns (uint256 payout)
```

Emergency path to redeem `shares` for `_owner`, paying to `to`.
@dev
- Reverts if `shares > maxRedeem(_owner)`.
- Burns `shares`, applies penalty to the resulting assets, and returns the post-penalty payout.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Shares to redeem. |
| to | address | Recipient of the post-penalty payout. |
| _owner | address | Share owner whose position will be reduced. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| payout | uint256 | Assets actually transferred to `to` after penalties. |

### _emergencyWithdraw

```solidity
function _emergencyWithdraw(address by, address to, address _owner, uint256 assets, uint256 shares) internal returns (uint256 payout)
```

Internal implementation for both emergency paths.
@dev
- Applies `penaltyPercentage` to `assets` and transfers penalty to `treasury`.
- Burns `shares` and updates internal share locks.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| by | address | Caller that triggered the emergency flow. |
| to | address | Recipient of the post-penalty payout. |
| _owner | address | Share owner whose `shares` are burned. |
| assets | uint256 | Assets value derived from the operation (pre-penalty). |
| shares | uint256 | Shares to burn. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| payout | uint256 | Assets actually transferred to `to` after penalties. |

### asset

```solidity
function asset() public view returns (address)
```

_To be overridden to return the address of the underlying asset.

- MUST be an ERC20 token contract.
- MUST NOT revert._

### totalAssets

```solidity
function totalAssets() public view returns (uint256 assets)
```

_Returns the total amount of the underlying asset managed by the Vault.

- SHOULD include any compounding that occurs from the yield.
- MUST be inclusive of any fees that are charged against assets in the Vault.
- MUST NOT revert._

### name

```solidity
function name() public pure returns (string)
```

_Returns the name of the token._

### symbol

```solidity
function symbol() public pure returns (string)
```

_Returns the symbol of the token._

### maxWithdraw

```solidity
function maxWithdraw(address owner) public view returns (uint256 maxAssets)
```

_Returns withdrawable assets limited to unlocked shares (ERC4626 compliance)._

### maxRedeem

```solidity
function maxRedeem(address owner) public view returns (uint256 maxShares)
```

_Returns redeemable shares limited to unlocked shares (ERC4626 compliance)._

### minStakePeriod

```solidity
function minStakePeriod() external view returns (uint256)
```

Getter for the minimum stake period (seconds).

### penaltyPercentage

```solidity
function penaltyPercentage() external view returns (uint256)
```

Getter for the penalty percentage (scaled by SCALING_FACTOR).

### treasury

```solidity
function treasury() external view returns (address)
```

Getter for the treasury address.

### rewardsDuration

```solidity
function rewardsDuration() external view returns (uint256)
```

Getter for the rewards vesting duration (seconds).

### _vestRewards

```solidity
function _vestRewards() internal returns (uint256 vested)
```

Updates locked reward accounting, unlocking the linear portion accrued since the last update.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| vested | uint256 | Amount of rewards unlocked in this call. |

### _currentLockedRewards

```solidity
function _currentLockedRewards() internal view returns (uint256)
```

View function returning currently locked (unvested) rewards.

_Does not mutate state; used by {totalAssets} for pricing._

### _transferStakeRecord

```solidity
function _transferStakeRecord(address from, address to, uint256 amount) internal
```

Moves stake accounting when ERC20 shares are transferred.

_Transfers unlocked shares first, then locked stake entries with swap-and-pop._

### _pushStake

```solidity
function _pushStake(address to, uint256 lockUntil, uint256 shares) internal
```

_Adds a stake entry for `to`, merging with the last entry if lock times match._

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 amount) internal
```

_Hook that is called before any transfer of tokens.
This includes minting and burning._

### _deposit

```solidity
function _deposit(address by, address to, uint256 assets, uint256 shares) internal
```

_For deposits and mints.

Emits a {Deposit} event._

### _withdraw

```solidity
function _withdraw(address by, address to, address _owner, uint256 assets, uint256 shares) internal
```

_Gas-efficient withdrawal with single pass consumption of unlocked shares._

### _collectUnlockedStakes

```solidity
function _collectUnlockedStakes(address staker) internal returns (uint256 unlockedTotal)
```

Moves unlocked stakes from the array into an accumulator and returns total unlocked shares.

_Swap-and-pop removal keeps iteration bounded by {MAX_STAKE_ENTRIES}._

### _viewUnlockedShares

```solidity
function _viewUnlockedShares(address staker) internal view returns (uint256 unlockedTotal)
```

View-only helper to compute unlocked shares (used by ERC4626 max functions).

### _consumeUnlockedSharesOrRevert

```solidity
function _consumeUnlockedSharesOrRevert(address staker, uint256 need) internal
```

Consumes exactly `need` unlocked shares or reverts.

_Uses an unlocked accumulator to avoid unbounded iteration._

### _removeAnySharesFor

```solidity
function _removeAnySharesFor(address staker, uint256 sharesRemaining) internal
```

Removes shares from stake entries regardless of lock status (used in emergency flows).

_Swap-and-pop for full consumption; partial consumption reduces the entry in-place._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| staker | address | Address whose stake entries are modified. |
| sharesRemaining | uint256 | Number of shares to remove. |

### _removeSharesForEmergency

```solidity
function _removeSharesForEmergency(address staker, uint256 shares) internal returns (uint256 lockedConsumed, uint256 unlockedConsumed)
```

Removes shares and returns how many locked versus unlocked shares were consumed (for emergency flows).

_Uses unlocked accumulator first, then locked entries; does not enforce min stake period._

### _setTreasury

```solidity
function _setTreasury(address _treasury) internal
```

Internal setter for the treasury address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _treasury | address | New treasury address. |

