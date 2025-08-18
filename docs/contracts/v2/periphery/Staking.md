# Solidity API

## Staking

ERC4626-compatible staking vault for the LONG token with time-locks,
        proportional reward distribution via deposits (rebase effect),
        and an emergency withdrawal path with a configurable penalty.
@dev
- Uses share-based locks to remain correct under reward top-ups that change the exchange rate.
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

### RewardsDistributed

```solidity
event RewardsDistributed(uint256 amount)
```

Emitted when rewards are added to the vault (increasing share backing).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Amount of LONG transferred into the vault as rewards. |

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

### TreasurySet

```solidity
event TreasurySet(address treasury)
```

Emitted when the treasury address is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| treasury | address | New treasury address. |

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
| assets | uint256 | Amount of assets redeemed prior to penalty. |
| shares | uint256 | Amount of shares burned. |

### Stake

Records locked staking positions in shares to remain rebase-safe.

_`shares` represent ERC4626 shares minted on deposit; lock expires at `timestamp + minStakePeriod`._

```solidity
struct Stake {
  uint256 shares;
  uint256 timestamp;
}
```

### SCALING_FACTOR

```solidity
uint16 SCALING_FACTOR
```

Percentage scaling factor where 10_000 equals 100%.

### treasury

```solidity
address treasury
```

Treasury address that receives penalties from emergency withdrawals.

### minStakePeriod

```solidity
uint256 minStakePeriod
```

Global minimum staking/lock duration in seconds (applies per stake entry).

### penaltyPercentage

```solidity
uint256 penaltyPercentage
```

Penalty percentage applied in emergency flows, scaled by {SCALING_FACTOR}.

### stakes

```solidity
mapping(address => struct Staking.Stake[]) stakes
```

User stake entries stored as arrays per staker.

_Public getter: `stakes(user, i)` → `(shares, timestamp)`._

### constructor

```solidity
constructor(address _owner, address _treasury, address long) public
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

_Reverts if `period == 0`._

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

### distributeRewards

```solidity
function distributeRewards(uint256 amount) external
```

Adds rewards to the vault, increasing the asset backing per share.

_Caller must approve this contract to pull `amount` LONG beforehand._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Amount of LONG to transfer in as rewards (must be > 0). |

### emergencyWithdraw

```solidity
function emergencyWithdraw(uint256 assets, address to, address _owner) external returns (uint256 shares)
```

Emergency path to withdraw a target `assets` amount for `_owner`, paying to `to`.
@dev
- Reverts if `assets > maxWithdraw(_owner)`.
- Burns the corresponding `shares` and applies penalty to `assets`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Target assets to withdraw (pre-penalty). |
| to | address | Recipient of the post-penalty payout. |
| _owner | address | Share owner whose position will be reduced. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Shares burned to facilitate the withdrawal. |

### emergencyRedeem

```solidity
function emergencyRedeem(uint256 shares, address to, address _owner) external returns (uint256 assets)
```

Emergency path to redeem `shares` for `_owner`, paying to `to`.
@dev
- Reverts if `shares > maxRedeem(_owner)`.
- Burns `shares`, applies penalty to the resulting assets.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Shares to redeem. |
| to | address | Recipient of the post-penalty payout. |
| _owner | address | Share owner whose position will be reduced. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Assets calculated from `shares` before penalty. |

### _emergencyWithdraw

```solidity
function _emergencyWithdraw(address by, address to, address _owner, uint256 assets, uint256 shares) internal
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

### asset

```solidity
function asset() public view returns (address)
```

_To be overridden to return the address of the underlying asset.

- MUST be an ERC20 token contract.
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

### _removeUnlockedSharesFor

```solidity
function _removeUnlockedSharesFor(address staker, uint256 shares) internal
```

Removes unlocked shares from the stake array until `shares` are satisfied.

_Swap-and-pop for full consumption; partial consumption reduces the entry in-place._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| staker | address | Address whose stake entries are modified. |
| shares | uint256 | Number of unlocked shares to remove. |

### _removeAnySharesFor

```solidity
function _removeAnySharesFor(address staker, uint256 shares) internal
```

Removes shares from stake entries regardless of lock status (used in emergency paths).

_Swap-and-pop for full consumption; partial consumption reduces the entry in-place._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| staker | address | Address whose stake entries are modified. |
| shares | uint256 | Number of shares to remove. |

### _setTreasury

```solidity
function _setTreasury(address _treasury) internal
```

Internal setter for the treasury address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _treasury | address | New treasury address. |

