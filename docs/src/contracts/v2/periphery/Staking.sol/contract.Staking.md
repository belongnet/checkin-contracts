# Staking
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/periphery/Staking.sol)

**Inherits:**
Initializable, ERC4626, Ownable

**Title:**
LONG Single-Asset Staking Vault (ERC4626)

ERC4626-compatible staking vault for the LONG token with time-locks,
linearly streamed owner-funded rewards that vest into the share price,
and an emergency withdrawal path with a configurable penalty.


- Uses share-based locks to remain correct under reward streaming that changes the exchange rate over time.
- Emergency flow burns shares and pays out `assets - penalty`, transferring penalty to `treasury`.
- Owner can configure the minimum stake period and penalty percentage.
- Underlying asset address is returned by {asset()} and is immutable after construction.


## State Variables
### SCALING_FACTOR
Percentage scaling factor where 10_000 equals 100%.


```solidity
uint256 public constant SCALING_FACTOR = 10_000
```


### MAX_STAKE_ENTRIES
Maximum number of active stake entries allowed per staker to prevent unbounded gas usage.


```solidity
uint256 public constant MAX_STAKE_ENTRIES = 64
```


### stakes
User stake entries stored as arrays per staker.

Public getter: `stakes(user, i)` → `(shares, timestamp)`.


```solidity
mapping(address staker => Stake[] times) public stakes
```


### unlockedStakes
Aggregates shares whose lock period elapsed to avoid bloated stake arrays.


```solidity
mapping(address staker => uint256 unlockedStakeShares) public unlockedStakes
```


### rewards

```solidity
Rewards public rewards
```


### config

```solidity
Config public config
```


## Functions
### constructor

**Note:**
oz-upgrades-unsafe-allow: constructor


```solidity
constructor() ;
```

### initialize

Initializes the staking vault.


```solidity
function initialize(address _owner, address _treasury, address long) external initializer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_owner`|`address`|Address to be set as the owner.|
|`_treasury`|`address`|Treasury address to receive emergency penalties.|
|`long`|`address`|Address of the LONG ERC20 token (underlying asset).|


### setMinStakePeriod

Sets the minimum stake period.

Reverts if `period == 0`.
Applies only to future stakes; existing `lockUntil` values remain unchanged.


```solidity
function setMinStakePeriod(uint256 period) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`period`|`uint256`|New minimum stake period in seconds.|


### setPenaltyPercentage

Sets the emergency penalty percentage.

Reverts if `newPercent > SCALING_FACTOR` (i.e., > 100%).


```solidity
function setPenaltyPercentage(uint256 newPercent) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`newPercent`|`uint256`|New penalty percentage scaled by {SCALING_FACTOR}.|


### setTreasury

Updates the treasury address.


```solidity
function setTreasury(address _treasury) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_treasury`|`address`|New treasury address.|


### setRewardsDuration

Sets the duration (in seconds) over which rewards vest linearly.

Reverts if `duration == 0`.


```solidity
function setRewardsDuration(uint256 duration) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`duration`|`uint256`|Reward vesting duration.|


### distributeRewards

Enqueues rewards that vest linearly over [rewardsDuration](/contracts/v2/periphery/Staking.sol/contract.Staking.md#rewardsduration).

Caller must approve this contract to pull `amount` LONG beforehand.


```solidity
function distributeRewards(uint256 amount) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`amount`|`uint256`|Amount of LONG to stream as rewards (must be > 0).|


### emergencyWithdraw

Emergency path to withdraw a target `assets` amount for `_owner`, paying to `to`.


- Reverts if `assets > maxWithdraw(_owner)`.
- Burns the corresponding `shares`, applies penalty to locked portions, and returns the post-penalty payout.


```solidity
function emergencyWithdraw(uint256 assets, address to, address _owner) external returns (uint256 payout);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`assets`|`uint256`|Target assets to withdraw (pre-penalty).|
|`to`|`address`|Recipient of the post-penalty payout.|
|`_owner`|`address`|Share owner whose position will be reduced.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`payout`|`uint256`|Assets actually transferred to `to` after penalties.|


### emergencyRedeem

Emergency path to redeem `shares` for `_owner`, paying to `to`.


- Reverts if `shares > maxRedeem(_owner)`.
- Burns `shares`, applies penalty to the resulting assets, and returns the post-penalty payout.


```solidity
function emergencyRedeem(uint256 shares, address to, address _owner) external returns (uint256 payout);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`shares`|`uint256`|Shares to redeem.|
|`to`|`address`|Recipient of the post-penalty payout.|
|`_owner`|`address`|Share owner whose position will be reduced.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`payout`|`uint256`|Assets actually transferred to `to` after penalties.|


### _emergencyWithdraw

Internal implementation for both emergency paths.


- Applies `penaltyPercentage` to `assets` and transfers penalty to `treasury`.
- Burns `shares` and updates internal share locks.


```solidity
function _emergencyWithdraw(address by, address to, address _owner, uint256 assets, uint256 shares)
    internal
    returns (uint256 payout);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`by`|`address`|Caller that triggered the emergency flow.|
|`to`|`address`|Recipient of the post-penalty payout.|
|`_owner`|`address`|Share owner whose `shares` are burned.|
|`assets`|`uint256`|Assets value derived from the operation (pre-penalty).|
|`shares`|`uint256`|Shares to burn.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`payout`|`uint256`|Assets actually transferred to `to` after penalties.|


### asset

To be overridden to return the address of the underlying asset.
- MUST be an ERC20 token contract.
- MUST NOT revert.


```solidity
function asset() public view override returns (address);
```

### totalAssets

Returns the total amount of the underlying asset managed by the Vault.
- SHOULD include any compounding that occurs from the yield.
- MUST be inclusive of any fees that are charged against assets in the Vault.
- MUST NOT revert.


```solidity
function totalAssets() public view override returns (uint256 assets);
```

### name

Returns the name of the token.


```solidity
function name() public pure override returns (string memory);
```

### symbol

Returns the symbol of the token.


```solidity
function symbol() public pure override returns (string memory);
```

### maxWithdraw

Returns withdrawable assets limited to unlocked shares (ERC4626 compliance).


```solidity
function maxWithdraw(address owner) public view override returns (uint256 maxAssets);
```

### maxRedeem

Returns redeemable shares limited to unlocked shares (ERC4626 compliance).


```solidity
function maxRedeem(address owner) public view override returns (uint256 maxShares);
```

### minStakePeriod

Getter for the minimum stake period (seconds).


```solidity
function minStakePeriod() external view returns (uint256);
```

### penaltyPercentage

Getter for the penalty percentage (scaled by SCALING_FACTOR).


```solidity
function penaltyPercentage() external view returns (uint256);
```

### treasury

Getter for the treasury address.


```solidity
function treasury() external view returns (address);
```

### rewardsDuration

Getter for the rewards vesting duration (seconds).


```solidity
function rewardsDuration() external view returns (uint256);
```

### _vestRewards

Updates locked reward accounting, unlocking the linear portion accrued since the last update.


```solidity
function _vestRewards() internal returns (uint256 vested);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`vested`|`uint256`|Amount of rewards unlocked in this call.|


### _currentLockedRewards

View function returning currently locked (unvested) rewards.

Does not mutate state; used by [totalAssets](/contracts/v2/periphery/Staking.sol/contract.Staking.md#totalassets) for pricing.


```solidity
function _currentLockedRewards() internal view returns (uint256);
```

### _transferStakeRecord

Moves stake accounting when ERC20 shares are transferred.

Transfers unlocked shares first, then locked stake entries with swap-and-pop.


```solidity
function _transferStakeRecord(address from, address to, uint256 amount) internal;
```

### _pushStake

Adds a stake entry for `to`, merging with the last entry if lock times match.


```solidity
function _pushStake(address to, uint256 lockUntil, uint256 shares) internal;
```

### _beforeTokenTransfer


```solidity
function _beforeTokenTransfer(address from, address to, uint256 amount) internal override;
```

### _deposit


```solidity
function _deposit(address by, address to, uint256 assets, uint256 shares) internal override;
```

### _withdraw

Gas-efficient withdrawal with single pass consumption of unlocked shares.


```solidity
function _withdraw(address by, address to, address _owner, uint256 assets, uint256 shares) internal override;
```

### _collectUnlockedStakes

Moves unlocked stakes from the array into an accumulator and returns total unlocked shares.

Swap-and-pop removal keeps iteration bounded by {MAX_STAKE_ENTRIES}.


```solidity
function _collectUnlockedStakes(address staker) internal returns (uint256 unlockedTotal);
```

### _viewUnlockedShares

View-only helper to compute unlocked shares (used by ERC4626 max functions).


```solidity
function _viewUnlockedShares(address staker) internal view returns (uint256 unlockedTotal);
```

### _consumeUnlockedSharesOrRevert

Consumes exactly `need` unlocked shares or reverts.

Uses an unlocked accumulator to avoid unbounded iteration.


```solidity
function _consumeUnlockedSharesOrRevert(address staker, uint256 need) internal;
```

### _removeAnySharesFor

Removes shares from stake entries regardless of lock status (used in emergency flows).

Swap-and-pop for full consumption; partial consumption reduces the entry in-place.


```solidity
function _removeAnySharesFor(address staker, uint256 sharesRemaining) internal;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`staker`|`address`|Address whose stake entries are modified.|
|`sharesRemaining`|`uint256`|Number of shares to remove.|


### _removeSharesForEmergency

Removes shares and returns how many locked versus unlocked shares were consumed (for emergency flows).

Uses unlocked accumulator first, then locked entries; does not enforce min stake period.


```solidity
function _removeSharesForEmergency(address staker, uint256 shares)
    internal
    returns (uint256 lockedConsumed, uint256 unlockedConsumed);
```

### _setTreasury

Internal setter for the treasury address.


```solidity
function _setTreasury(address _treasury) internal;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_treasury`|`address`|New treasury address.|


## Events
### MinStakePeriodSet
Emitted when the minimum stake period is updated.


```solidity
event MinStakePeriodSet(uint256 period);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`period`|`uint256`|New minimum stake period in seconds.|

### PenaltyPercentSet
Emitted when the penalty percentage is updated.


```solidity
event PenaltyPercentSet(uint256 percent);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`percent`|`uint256`|New penalty percentage scaled by {SCALING_FACTOR}.|

### RewardDurationSet
Emitted when the reward duration is updated.


```solidity
event RewardDurationSet(uint256 duration);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`duration`|`uint256`|New reward duration in seconds.|

### TreasurySet
Emitted when the treasury address is updated.


```solidity
event TreasurySet(address treasury);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`treasury`|`address`|New treasury address.|

### RewardsDistributed
Emitted when rewards are scheduled for linear distribution.


```solidity
event RewardsDistributed(uint256 amount, uint256 duration, uint256 rewardRate);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`amount`|`uint256`|Amount of LONG transferred in as rewards.|
|`duration`|`uint256`|Duration over which rewards vest linearly.|
|`rewardRate`|`uint256`|Tokens vested per second.|

### RewardsVested
Emitted when rewards are vested (unlocked) during state-changing operations.


```solidity
event RewardsVested(uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`amount`|`uint256`|Amount of LONG unlocked from the reward stream.|

### EmergencyWithdraw
Emitted for emergency withdrawals that burn shares and apply penalty.


```solidity
event EmergencyWithdraw(
    address indexed by, address indexed to, address indexed owner, uint256 assets, uint256 shares
);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`by`|`address`|Caller that triggered the emergency operation.|
|`to`|`address`|Recipient of the post-penalty payout.|
|`owner`|`address`|Owner whose shares were burned.|
|`assets`|`uint256`|Assets transferred to the recipient after penalty.|
|`shares`|`uint256`|Amount of shares burned.|

## Errors
### MinStakePeriodShouldBeGreaterThanZero
Reverts when attempting to set a zero minimum stake period.


```solidity
error MinStakePeriodShouldBeGreaterThanZero();
```

### MinStakePeriodNotMet
Reverts when a withdrawal is attempted but locked shares remain.


```solidity
error MinStakePeriodNotMet();
```

### PenaltyTooHigh
Reverts when the penalty percentage exceeds the scaling factor (100%).


```solidity
error PenaltyTooHigh();
```

### ZeroReward
Reverts when a zero-amount reward distribution is attempted.


```solidity
error ZeroReward();
```

### SharesEqZero
Reverts when a zero shares is attempted.


```solidity
error SharesEqZero();
```

### TooManyStakeEntries
Reverts when attempting to create more stake entries than allowed.


```solidity
error TooManyStakeEntries();
```

### RewardDurationShouldBeGreaterThanZero
Reverts when attempting to use a zero reward duration.


```solidity
error RewardDurationShouldBeGreaterThanZero();
```

### RewardRateZero
Reverts when reward rate would be zero for a scheduled distribution.


```solidity
error RewardRateZero();
```

## Structs
### Config
Records locked staking positions in shares to remain rebase-safe.

`shares` represent ERC4626 shares minted on deposit; lock expires at `timestamp + minStakePeriod`.


```solidity
struct Config {
    /// @notice Underlying LONG asset address.
    address LONG;
    /// @notice Treasury address that receives penalties from emergency withdrawals.
    address treasury;
    /// @notice Global minimum staking/lock duration in seconds (applies per stake entry).
    uint256 minStakePeriod;
    /// @notice Penalty percentage applied in emergency flows, scaled by {SCALING_FACTOR}.
    uint256 penaltyPercentage; // 10%
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

