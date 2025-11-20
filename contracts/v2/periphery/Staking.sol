// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {ERC4626} from "solady/src/tokens/ERC4626.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {FixedPointMathLib} from "solady/src/utils/FixedPointMathLib.sol";

/// @title LONG Single-Asset Staking Vault (ERC4626)
/// @notice ERC4626-compatible staking vault for the LONG token with time-locks,
///         linearly streamed owner-funded rewards that vest into the share price,
///         and an emergency withdrawal path with a configurable penalty.
/// @dev
/// - Uses share-based locks to remain correct under reward streaming that changes the exchange rate over time.
/// - Emergency flow burns shares and pays out `assets - penalty`, transferring penalty to `treasury`.
/// - Owner can configure the minimum stake period and penalty percentage.
/// - Underlying asset address is returned by {asset()} and is immutable after construction.
contract Staking is Initializable, ERC4626, Ownable {
    using SafeTransferLib for address;

    // ============================== Errors ==============================

    /// @notice Reverts when attempting to set a zero minimum stake period.
    error MinStakePeriodShouldBeGreaterThanZero();

    /// @notice Reverts when a withdrawal is attempted but locked shares remain.
    error MinStakePeriodNotMet();

    /// @notice Reverts when the penalty percentage exceeds the scaling factor (100%).
    error PenaltyTooHigh();

    /// @notice Reverts when a zero-amount reward distribution is attempted.
    error ZeroReward();

    /// @notice Reverts when a zero shares is attempted.
    error SharesEqZero();

    /// @notice Reverts when attempting to create more stake entries than allowed.
    error TooManyStakeEntries();

    /// @notice Reverts when attempting to use a zero reward duration.
    error RewardDurationShouldBeGreaterThanZero();

    /// @notice Reverts when reward rate would be zero for a scheduled distribution.
    error RewardRateZero();

    // ============================== Events ==============================

    /// @notice Emitted when the minimum stake period is updated.
    /// @param period New minimum stake period in seconds.
    event MinStakePeriodSet(uint256 period);

    /// @notice Emitted when the penalty percentage is updated.
    /// @param percent New penalty percentage scaled by {SCALING_FACTOR}.
    event PenaltyPercentSet(uint256 percent);

    /// @notice Emitted when the reward duration is updated.
    /// @param duration New reward duration in seconds.
    event RewardDurationSet(uint256 duration);

    /// @notice Emitted when the treasury address is updated.
    /// @param treasury New treasury address.
    event TreasurySet(address treasury);

    /// @notice Emitted when rewards are scheduled for linear distribution.
    /// @param amount Amount of LONG transferred in as rewards.
    /// @param duration Duration over which rewards vest linearly.
    /// @param rewardRate Tokens vested per second.
    event RewardsDistributed(uint256 amount, uint256 duration, uint256 rewardRate);

    /// @notice Emitted when rewards are vested (unlocked) during state-changing operations.
    /// @param amount Amount of LONG unlocked from the reward stream.
    event RewardsVested(uint256 amount);

    /// @notice Emitted for emergency withdrawals that burn shares and apply penalty.
    /// @param by Caller that triggered the emergency operation.
    /// @param to Recipient of the post-penalty payout.
    /// @param owner Owner whose shares were burned.
    /// @param assets Assets transferred to the recipient after penalty.
    /// @param shares Amount of shares burned.
    event EmergencyWithdraw(
        address indexed by, address indexed to, address indexed owner, uint256 assets, uint256 shares
    );

    // ============================== Types ==============================

    /// @notice Records locked staking positions in shares to remain rebase-safe.
    /// @dev `shares` represent ERC4626 shares minted on deposit; lock expires at `timestamp + minStakePeriod`.
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

    /// @notice Reward emission parameters for linear vesting of owner-supplied rewards.
    struct Rewards {
        uint256 duration;
        uint256 rate;
        uint256 periodFinish;
        uint256 lastUpdate;
        uint256 locked;
    }

    struct Stake {
        uint256 shares;
        uint256 lockUntil;
    }

    // ============================== Constants ==============================

    /// @notice Percentage scaling factor where 10_000 equals 100%.
    uint256 public constant SCALING_FACTOR = 10_000;

    /// @notice Maximum number of active stake entries allowed per staker to prevent unbounded gas usage.
    uint256 public constant MAX_STAKE_ENTRIES = 64;

    /// @notice User stake entries stored as arrays per staker.
    /// @dev Public getter: `stakes(user, i)` → `(shares, timestamp)`.
    mapping(address staker => Stake[] times) public stakes;

    /// @notice Aggregates shares whose lock period elapsed to avoid bloated stake arrays.
    mapping(address staker => uint256 unlockedStakeShares) public unlockedStakes;

    Rewards public rewards;
    Config public config;

    // ============================== Constructor ==============================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============================== Initialize ==============================

    /// @notice Initializes the staking vault.
    /// @param _owner Address to be set as the owner.
    /// @param _treasury Treasury address to receive emergency penalties.
    /// @param long Address of the LONG ERC20 token (underlying asset).
    function initialize(address _owner, address _treasury, address long) external initializer {
        Config storage _config = config;
        Rewards storage _rewards = rewards;
        _config.LONG = long;
        _config.minStakePeriod = 1 days;
        _config.penaltyPercentage = 1000; // 10%
        _rewards.duration = 7 days;
        _rewards.lastUpdate = block.timestamp;

        _setTreasury(_treasury);

        _initializeOwner(_owner);
    }

    // ============================== Admin Setters ==============================

    /// @notice Sets the minimum stake period.
    /// @dev Reverts if `period == 0`.
    ///      Applies only to future stakes; existing `lockUntil` values remain unchanged.
    /// @param period New minimum stake period in seconds.
    function setMinStakePeriod(uint256 period) external onlyOwner {
        require(period > 0, MinStakePeriodShouldBeGreaterThanZero());
        config.minStakePeriod = period;
        emit MinStakePeriodSet(period);
    }

    /// @notice Sets the emergency penalty percentage.
    /// @dev Reverts if `newPercent > SCALING_FACTOR` (i.e., > 100%).
    /// @param newPercent New penalty percentage scaled by {SCALING_FACTOR}.
    function setPenaltyPercentage(uint256 newPercent) external onlyOwner {
        require(newPercent <= SCALING_FACTOR, PenaltyTooHigh());
        config.penaltyPercentage = newPercent;
        emit PenaltyPercentSet(newPercent);
    }

    /// @notice Updates the treasury address.
    /// @param _treasury New treasury address.
    function setTreasury(address _treasury) external onlyOwner {
        _setTreasury(_treasury);
    }

    /// @notice Sets the duration (in seconds) over which rewards vest linearly.
    /// @dev Reverts if `duration == 0`.
    /// @param duration Reward vesting duration.
    function setRewardsDuration(uint256 duration) external onlyOwner {
        require(duration > 0, RewardDurationShouldBeGreaterThanZero());
        rewards.duration = duration;
        emit RewardDurationSet(duration);
    }

    // ============================== Rewards (Linear Emission) ==============================

    /// @notice Enqueues rewards that vest linearly over {rewardsDuration}.
    /// @dev Caller must approve this contract to pull `amount` LONG beforehand.
    /// @param amount Amount of LONG to stream as rewards (must be > 0).
    function distributeRewards(uint256 amount) external onlyOwner {
        require(amount > 0, ZeroReward());

        _vestRewards();

        Rewards storage _rewards = rewards;

        uint256 duration = _rewards.duration;
        require(duration > 0, RewardDurationShouldBeGreaterThanZero());

        uint256 newLocked = _rewards.locked + amount;
        uint256 newRate = newLocked / duration;
        require(newRate > 0, RewardRateZero());

        _rewards.rate = newRate;
        _rewards.periodFinish = block.timestamp + duration;
        _rewards.locked = newLocked;
        _rewards.lastUpdate = block.timestamp;

        config.LONG.safeTransferFrom(msg.sender, address(this), amount);

        emit RewardsDistributed(amount, duration, newRate);
    }

    // ============================== Emergency Flows ==============================

    /// @notice Emergency path to withdraw a target `assets` amount for `_owner`, paying to `to`.
    /// @dev
    /// - Reverts if `assets > maxWithdraw(_owner)`.
    /// - Burns the corresponding `shares`, applies penalty to locked portions, and returns the post-penalty payout.
    /// @param assets Target assets to withdraw (pre-penalty).
    /// @param to Recipient of the post-penalty payout.
    /// @param _owner Share owner whose position will be reduced.
    /// @return payout Assets actually transferred to `to` after penalties.
    function emergencyWithdraw(uint256 assets, address to, address _owner) external returns (uint256 payout) {
        uint256 shares = previewWithdraw(assets);
        require(shares <= balanceOf(_owner), WithdrawMoreThanMax());
        payout = _emergencyWithdraw(msg.sender, to, _owner, assets, shares);
    }

    /// @notice Emergency path to redeem `shares` for `_owner`, paying to `to`.
    /// @dev
    /// - Reverts if `shares > maxRedeem(_owner)`.
    /// - Burns `shares`, applies penalty to the resulting assets, and returns the post-penalty payout.
    /// @param shares Shares to redeem.
    /// @param to Recipient of the post-penalty payout.
    /// @param _owner Share owner whose position will be reduced.
    /// @return payout Assets actually transferred to `to` after penalties.
    function emergencyRedeem(uint256 shares, address to, address _owner) external returns (uint256 payout) {
        require(shares <= balanceOf(_owner), RedeemMoreThanMax());
        uint256 assets = previewRedeem(shares);
        payout = _emergencyWithdraw(msg.sender, to, _owner, assets, shares);
    }

    /// @notice Internal implementation for both emergency paths.
    /// @dev
    /// - Applies `penaltyPercentage` to `assets` and transfers penalty to `treasury`.
    /// - Burns `shares` and updates internal share locks.
    /// @param by Caller that triggered the emergency flow.
    /// @param to Recipient of the post-penalty payout.
    /// @param _owner Share owner whose `shares` are burned.
    /// @param assets Assets value derived from the operation (pre-penalty).
    /// @param shares Shares to burn.
    /// @return payout Assets actually transferred to `to` after penalties.
    function _emergencyWithdraw(address by, address to, address _owner, uint256 assets, uint256 shares)
        internal
        returns (uint256 payout)
    {
        require(shares > 0, SharesEqZero());
        _vestRewards();

        Config storage _config = config;
        (uint256 lockedSharesConsumed,) = _removeSharesForEmergency(_owner, shares);

        uint256 penalty;
        if (lockedSharesConsumed != 0) {
            uint256 lockedAssets = convertToAssets(lockedSharesConsumed);
            penalty = FixedPointMathLib.fullMulDiv(lockedAssets, _config.penaltyPercentage, SCALING_FACTOR);
        }

        unchecked {
            payout = assets - penalty;
        }

        if (by != _owner) {
            _spendAllowance(_owner, by, shares);
        }

        _burn(_owner, shares);

        _config.LONG.safeTransfer(to, payout);
        _config.LONG.safeTransfer(_config.treasury, penalty);

        emit EmergencyWithdraw(by, to, _owner, payout, shares);
        // also emit standard ERC4626 Withdraw for indexers/analytics
        emit Withdraw(by, to, _owner, payout, shares);
    }

    // ============================== ERC4626 Metadata ==============================

    /// @inheritdoc ERC4626
    function asset() public view override returns (address) {
        return config.LONG;
    }

    /// @inheritdoc ERC4626
    function totalAssets() public view override returns (uint256 assets) {
        assets = SafeTransferLib.balanceOf(config.LONG, address(this));
        uint256 locked = _currentLockedRewards();
        if (locked >= assets) {
            return 0;
        }
        unchecked {
            assets -= locked;
        }
    }

    /// @dev Returns the name of the token.
    function name() public pure override returns (string memory) {
        return "LONG Staking";
    }

    /// @dev Returns the symbol of the token.
    function symbol() public pure override returns (string memory) {
        return "sLONG";
    }

    /// @inheritdoc ERC4626
    /// @dev Returns withdrawable assets limited to unlocked shares (ERC4626 compliance).
    function maxWithdraw(address owner) public view override returns (uint256 maxAssets) {
        uint256 unlockedShares = _viewUnlockedShares(owner);
        if (unlockedShares == 0) {
            return 0;
        }
        uint256 balance = balanceOf(owner);
        if (unlockedShares > balance) {
            unlockedShares = balance;
        }
        maxAssets = convertToAssets(unlockedShares);
    }

    /// @inheritdoc ERC4626
    /// @dev Returns redeemable shares limited to unlocked shares (ERC4626 compliance).
    function maxRedeem(address owner) public view override returns (uint256 maxShares) {
        uint256 unlockedShares = _viewUnlockedShares(owner);
        uint256 balance = balanceOf(owner);
        maxShares = unlockedShares > balance ? balance : unlockedShares;
    }

    /// @notice Getter for the minimum stake period (seconds).
    function minStakePeriod() external view returns (uint256) {
        return config.minStakePeriod;
    }

    /// @notice Getter for the penalty percentage (scaled by SCALING_FACTOR).
    function penaltyPercentage() external view returns (uint256) {
        return config.penaltyPercentage;
    }

    /// @notice Getter for the treasury address.
    function treasury() external view returns (address) {
        return config.treasury;
    }

    /// @notice Getter for the rewards vesting duration (seconds).
    function rewardsDuration() external view returns (uint256) {
        return rewards.duration;
    }

    // ============================== Reward Accrual ==============================

    /// @notice Updates locked reward accounting, unlocking the linear portion accrued since the last update.
    /// @return vested Amount of rewards unlocked in this call.
    function _vestRewards() internal returns (uint256 vested) {
        Rewards storage _rewards = rewards;

        uint256 _lockedRewards = _rewards.locked;
        if (_lockedRewards == 0) {
            _rewards.lastUpdate = block.timestamp;
            return 0;
        }

        uint256 currentTime = block.timestamp;
        uint256 finish = _rewards.periodFinish;
        uint256 lastUpdate = _rewards.lastUpdate;
        uint256 cappedTime = currentTime < finish ? currentTime : finish;
        if (cappedTime <= lastUpdate) {
            return 0;
        }

        uint256 elapsed = cappedTime - lastUpdate;
        uint256 unlockAmount = _rewards.rate * elapsed;

        if (unlockAmount >= _lockedRewards || cappedTime == finish) {
            vested = _lockedRewards;
            _rewards.locked = 0;
            _rewards.rate = 0;
        } else {
            vested = unlockAmount;
            _rewards.locked = _lockedRewards - unlockAmount;
        }

        _rewards.lastUpdate = cappedTime;

        if (vested != 0) {
            emit RewardsVested(vested);
        }
    }

    /// @notice View function returning currently locked (unvested) rewards.
    /// @dev Does not mutate state; used by {totalAssets} for pricing.
    function _currentLockedRewards() internal view returns (uint256) {
        Rewards storage _rewards = rewards;
        uint256 _lockedRewards = _rewards.locked;
        if (_lockedRewards == 0) {
            return 0;
        }

        uint256 current = block.timestamp;
        uint256 finish = _rewards.periodFinish;
        uint256 lastUpdate = _rewards.lastUpdate;
        uint256 cappedTime = current < finish ? current : finish;
        if (cappedTime <= lastUpdate) {
            return _lockedRewards;
        }

        uint256 elapsed = cappedTime - lastUpdate;
        uint256 unlockAmount = _rewards.rate * elapsed;

        if (unlockAmount >= _lockedRewards || cappedTime == finish) {
            return 0;
        }
        return _lockedRewards - unlockAmount;
    }

    /// @notice Moves stake accounting when ERC20 shares are transferred.
    /// @dev Transfers unlocked shares first, then locked stake entries with swap-and-pop.
    function _transferStakeRecord(address from, address to, uint256 amount) internal {
        uint256 remaining = amount;

        uint256 fromUnlocked = unlockedStakes[from];
        if (fromUnlocked != 0) {
            uint256 unlockedTake = remaining <= fromUnlocked ? remaining : fromUnlocked;
            unchecked {
                unlockedStakes[from] = fromUnlocked - unlockedTake;
                unlockedStakes[to] += unlockedTake;
                remaining -= unlockedTake;
            }
        }

        Stake[] storage fromStakes = stakes[from];

        for (uint256 i; i < fromStakes.length && remaining > 0;) {
            Stake memory stake = fromStakes[i];
            if (stake.shares <= remaining) {
                remaining -= stake.shares;
                _pushStake(to, stake.lockUntil, stake.shares);
                fromStakes[i] = fromStakes[fromStakes.length - 1];
                fromStakes.pop();
                // don't ++i: a new element is now at index i
            } else {
                fromStakes[i].shares = stake.shares - remaining;
                _pushStake(to, stake.lockUntil, remaining);
                remaining = 0;
                unchecked {
                    ++i;
                }
            }
        }
    }

    /// @dev Adds a stake entry for `to`, merging with the last entry if lock times match.
    function _pushStake(address to, uint256 lockUntil, uint256 shares) internal {
        Stake[] storage dest = stakes[to];
        uint256 len = dest.length;

        if (len != 0 && dest[len - 1].lockUntil == lockUntil) {
            dest[len - 1].shares += shares;
            return;
        }

        require(len < MAX_STAKE_ENTRIES, TooManyStakeEntries());
        dest.push(Stake({shares: shares, lockUntil: lockUntil}));
    }

    // ============================== Hooks ==============================

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        if (amount == 0 || from == address(0) || to == address(0)) return;
        _collectUnlockedStakes(from);
        _collectUnlockedStakes(to);
        _transferStakeRecord(from, to, amount);
    }

    function _deposit(address by, address to, uint256 assets, uint256 shares) internal override {
        require(shares > 0, SharesEqZero());
        _vestRewards();
        super._deposit(by, to, assets, shares);
        _collectUnlockedStakes(to);

        _pushStake(to, block.timestamp + config.minStakePeriod, shares);
    }

    /// @dev Gas-efficient withdrawal with single pass consumption of unlocked shares.
    function _withdraw(address by, address to, address _owner, uint256 assets, uint256 shares) internal override {
        _vestRewards();
        _consumeUnlockedSharesOrRevert(_owner, shares);
        super._withdraw(by, to, _owner, assets, shares);
    }

    // ============================== Stake Bookkeeping ==============================

    /// @notice Moves unlocked stakes from the array into an accumulator and returns total unlocked shares.
    /// @dev Swap-and-pop removal keeps iteration bounded by {MAX_STAKE_ENTRIES}.
    function _collectUnlockedStakes(address staker) internal returns (uint256 unlockedTotal) {
        Stake[] storage userStakes = stakes[staker];
        uint256 nowTs = block.timestamp;
        uint256 newlyUnlocked;

        for (uint256 i; i < userStakes.length;) {
            Stake memory stake = userStakes[i];
            if (nowTs >= stake.lockUntil) {
                newlyUnlocked += stake.shares;
                userStakes[i] = userStakes[userStakes.length - 1];
                userStakes.pop();
            } else {
                unchecked {
                    ++i;
                }
            }
        }

        if (newlyUnlocked != 0) {
            unlockedTotal = unlockedStakes[staker] + newlyUnlocked;
            unlockedStakes[staker] = unlockedTotal;
        } else {
            unlockedTotal = unlockedStakes[staker];
        }
    }

    /// @notice View-only helper to compute unlocked shares (used by ERC4626 max functions).
    function _viewUnlockedShares(address staker) internal view returns (uint256 unlockedTotal) {
        Stake[] storage userStakes = stakes[staker];
        uint256 nowTs = block.timestamp;
        unlockedTotal = unlockedStakes[staker];

        for (uint256 i; i < userStakes.length;) {
            Stake memory stake = userStakes[i];
            if (nowTs >= stake.lockUntil) {
                unlockedTotal += stake.shares;
            }
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Consumes exactly `need` unlocked shares or reverts.
    /// @dev Uses an unlocked accumulator to avoid unbounded iteration.
    function _consumeUnlockedSharesOrRevert(address staker, uint256 need) internal {
        uint256 unlocked = _collectUnlockedStakes(staker);
        require(unlocked >= need, MinStakePeriodNotMet());

        unchecked {
            unlockedStakes[staker] = unlocked - need;
        }
    }

    /// @notice Removes shares from stake entries regardless of lock status (used in emergency flows).
    /// @dev Swap-and-pop for full consumption; partial consumption reduces the entry in-place.
    /// @param staker Address whose stake entries are modified.
    /// @param sharesRemaining Number of shares to remove.
    function _removeAnySharesFor(address staker, uint256 sharesRemaining) internal {
        (uint256 lockedConsumed,) = _removeSharesForEmergency(staker, sharesRemaining);
        lockedConsumed; // silence unused warning; function signature maintained for legacy callers.
    }

    /// @notice Removes shares and returns how many locked versus unlocked shares were consumed (for emergency flows).
    /// @dev Uses unlocked accumulator first, then locked entries; does not enforce min stake period.
    function _removeSharesForEmergency(address staker, uint256 shares)
        internal
        returns (uint256 lockedConsumed, uint256 unlockedConsumed)
    {
        uint256 unlocked = _collectUnlockedStakes(staker);

        if (unlocked != 0) {
            unlockedConsumed = shares <= unlocked ? shares : unlocked;
            unchecked {
                unlockedStakes[staker] = unlocked - unlockedConsumed;
            }
        }

        uint256 remaining = shares - unlockedConsumed;
        if (remaining == 0) {
            return (0, unlockedConsumed);
        }

        Stake[] storage userStakes = stakes[staker];

        for (uint256 i; i < userStakes.length && remaining > 0;) {
            uint256 stakeShares = userStakes[i].shares;
            if (stakeShares <= remaining) {
                lockedConsumed += stakeShares;
                remaining -= stakeShares;
                userStakes[i] = userStakes[userStakes.length - 1];
                userStakes.pop();
                // don't ++i: a new element is now at index i
            } else {
                userStakes[i].shares = stakeShares - remaining;
                lockedConsumed += remaining;
                remaining = 0;
                unchecked {
                    ++i;
                }
            }
        }
    }

    // ============================== Internal Utils ==============================

    /// @notice Internal setter for the treasury address.
    /// @param _treasury New treasury address.
    function _setTreasury(address _treasury) internal {
        config.treasury = _treasury;
        emit TreasurySet(_treasury);
    }
}
