// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {ERC4626} from "solady/src/tokens/ERC4626.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {FixedPointMathLib} from "solady/src/utils/FixedPointMathLib.sol";

/// @title LONG Single-Asset Staking Vault (ERC4626)
/// @notice ERC4626-compatible staking vault for the LONG token with time-locks,
///         proportional reward distribution via deposits (rebase effect),
///         and an emergency withdrawal path with a configurable penalty.
/// @dev
/// - Uses share-based locks to remain correct under reward top-ups that change the exchange rate.
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

    // ============================== Events ==============================

    /// @notice Emitted when rewards are added to the vault (increasing share backing).
    /// @param amount Amount of LONG transferred into the vault as rewards.
    event RewardsDistributed(uint256 amount);

    /// @notice Emitted when the minimum stake period is updated.
    /// @param period New minimum stake period in seconds.
    event MinStakePeriodSet(uint256 period);

    /// @notice Emitted when the penalty percentage is updated.
    /// @param percent New penalty percentage scaled by {SCALING_FACTOR}.
    event PenaltyPercentSet(uint256 percent);

    /// @notice Emitted when the treasury address is updated.
    /// @param treasury New treasury address.
    event TreasurySet(address treasury);

    /// @notice Emitted for emergency withdrawals that burn shares and apply penalty.
    /// @param by Caller that triggered the emergency operation.
    /// @param to Recipient of the post-penalty payout.
    /// @param owner Owner whose shares were burned.
    /// @param assets Amount of assets redeemed prior to penalty.
    /// @param shares Amount of shares burned.
    event EmergencyWithdraw(
        address indexed by, address indexed to, address indexed owner, uint256 assets, uint256 shares
    );

    // ============================== Types ==============================

    /// @notice Records locked staking positions in shares to remain rebase-safe.
    /// @dev `shares` represent ERC4626 shares minted on deposit; lock expires at `timestamp + minStakePeriod`.
    struct Stake {
        uint256 shares;
        uint256 timestamp;
    }

    // ============================== Constants ==============================

    /// @notice Percentage scaling factor where 10_000 equals 100%.
    uint16 public constant SCALING_FACTOR = 10000;

    // ============================== Immutables ==============================

    /// @notice Underlying LONG asset address.
    /// @dev Immutable after construction; returned by {asset()}.
    address private LONG;

    // ============================== Storage ==============================

    /// @notice Treasury address that receives penalties from emergency withdrawals.
    address public treasury;

    /// @notice Global minimum staking/lock duration in seconds (applies per stake entry).
    uint256 public minStakePeriod;

    /// @notice Penalty percentage applied in emergency flows, scaled by {SCALING_FACTOR}.
    uint256 public penaltyPercentage; // 10%

    /// @notice User stake entries stored as arrays per staker.
    /// @dev Public getter: `stakes(user, i)` → `(shares, timestamp)`.
    mapping(address staker => Stake[] times) public stakes;

    // ============================== Constructor ==============================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the staking vault.
    /// @param _owner Address to be set as the owner.
    /// @param _treasury Treasury address to receive emergency penalties.
    /// @param long Address of the LONG ERC20 token (underlying asset).
    function initialize(address _owner, address _treasury, address long) external initializer {
        LONG = long;
        minStakePeriod = 1 days;
        penaltyPercentage = 1000;
        _setTreasury(_treasury);
        _initializeOwner(_owner);
    }

    // ============================== Admin Setters ==============================

    /// @notice Sets the minimum stake period.
    /// @dev Reverts if `period == 0`.
    /// @param period New minimum stake period in seconds.
    function setMinStakePeriod(uint256 period) external onlyOwner {
        require(period > 0, MinStakePeriodShouldBeGreaterThanZero());
        minStakePeriod = period;
        emit MinStakePeriodSet(period);
    }

    /// @notice Sets the emergency penalty percentage.
    /// @dev Reverts if `newPercent > SCALING_FACTOR` (i.e., > 100%).
    /// @param newPercent New penalty percentage scaled by {SCALING_FACTOR}.
    function setPenaltyPercentage(uint256 newPercent) external onlyOwner {
        require(newPercent <= SCALING_FACTOR, PenaltyTooHigh());
        penaltyPercentage = newPercent;
        emit PenaltyPercentSet(newPercent);
    }

    /// @notice Updates the treasury address.
    /// @param _treasury New treasury address.
    function setTreasury(address _treasury) external onlyOwner {
        _setTreasury(_treasury);
    }

    // ============================== Rewards (Rebase Effect) ==============================

    /// @notice Adds rewards to the vault, increasing the asset backing per share.
    /// @dev Caller must approve this contract to pull `amount` LONG beforehand.
    /// @param amount Amount of LONG to transfer in as rewards (must be > 0).
    function distributeRewards(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroReward();
        LONG.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardsDistributed(amount);
    }

    // ============================== Emergency Flows ==============================

    /// @notice Emergency path to withdraw a target `assets` amount for `_owner`, paying to `to`.
    /// @dev
    /// - Reverts if `assets > maxWithdraw(_owner)`.
    /// - Burns the corresponding `shares` and applies penalty to `assets`.
    /// @param assets Target assets to withdraw (pre-penalty).
    /// @param to Recipient of the post-penalty payout.
    /// @param _owner Share owner whose position will be reduced.
    /// @return shares Shares burned to facilitate the withdrawal.
    function emergencyWithdraw(uint256 assets, address to, address _owner) external returns (uint256 shares) {
        if (assets > maxWithdraw(_owner)) revert WithdrawMoreThanMax();
        shares = previewWithdraw(assets);
        _emergencyWithdraw(msg.sender, to, _owner, assets, shares);
    }

    /// @notice Emergency path to redeem `shares` for `_owner`, paying to `to`.
    /// @dev
    /// - Reverts if `shares > maxRedeem(_owner)`.
    /// - Burns `shares`, applies penalty to the resulting assets.
    /// @param shares Shares to redeem.
    /// @param to Recipient of the post-penalty payout.
    /// @param _owner Share owner whose position will be reduced.
    /// @return assets Assets calculated from `shares` before penalty.
    function emergencyRedeem(uint256 shares, address to, address _owner) external returns (uint256 assets) {
        if (shares > maxRedeem(_owner)) revert RedeemMoreThanMax();
        assets = previewRedeem(shares);
        _emergencyWithdraw(msg.sender, to, _owner, assets, shares);
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
    function _emergencyWithdraw(address by, address to, address _owner, uint256 assets, uint256 shares) internal {
        require(shares > 0, SharesEqZero());

        uint256 penalty = FixedPointMathLib.fullMulDiv(assets, penaltyPercentage, SCALING_FACTOR);
        uint256 payout;
        unchecked {
            payout = assets - penalty;
        }

        if (by != _owner) _spendAllowance(_owner, by, shares);

        _removeAnySharesFor(_owner, shares);
        _burn(_owner, shares);

        LONG.safeTransfer(to, payout);
        LONG.safeTransfer(treasury, penalty);

        emit EmergencyWithdraw(by, to, _owner, assets, shares);
        emit Withdraw(by, to, _owner, assets, shares);
    }

    // ============================== ERC4626 Metadata ==============================

    /// @inheritdoc ERC4626
    function asset() public view override returns (address) {
        return LONG;
    }

    /// @dev Returns the name of the token.
    function name() public pure override returns (string memory) {
        return "LONG Staking";
    }

    /// @dev Returns the symbol of the token.
    function symbol() public pure override returns (string memory) {
        return "sLONG";
    }

    // ============================== Hooks ==============================

    function _deposit(address by, address to, uint256 assets, uint256 shares) internal override {
        super._deposit(by, to, assets, shares);

        stakes[to].push(Stake({shares: shares, timestamp: block.timestamp}));
    }

    function _withdraw(address by, address to, address _owner, uint256 assets, uint256 shares) internal override {
        Stake[] memory userStakes = stakes[_owner];
        uint256 _minStakePeriod = minStakePeriod;

        uint256 unlockedShares = 0;
        for (uint256 i = 0; i < userStakes.length; ++i) {
            if (block.timestamp >= userStakes[i].timestamp + _minStakePeriod) {
                unlockedShares += userStakes[i].shares;
            }
        }

        if (unlockedShares < shares) revert MinStakePeriodNotMet();

        _removeUnlockedSharesFor(_owner, shares);

        super._withdraw(by, to, _owner, assets, shares);
    }

    // ============================== Stake Bookkeeping ==============================

    /// @notice Removes unlocked shares from the stake array until `shares` are satisfied.
    /// @dev Swap-and-pop for full consumption; partial consumption reduces the entry in-place.
    /// @param staker Address whose stake entries are modified.
    /// @param shares Number of unlocked shares to remove.
    function _removeUnlockedSharesFor(address staker, uint256 shares) internal {
        Stake[] storage userStakes = stakes[staker];
        uint256 _minStakePeriod = minStakePeriod;
        uint256 remaining = shares;

        for (uint256 i = 0; i < userStakes.length && remaining > 0;) {
            Stake memory stake = userStakes[i];
            if (block.timestamp >= stake.timestamp + _minStakePeriod) {
                if (stake.shares <= remaining) {
                    remaining -= stake.shares;
                    userStakes[i] = userStakes[userStakes.length - 1];
                    userStakes.pop();
                } else {
                    userStakes[i].shares = stake.shares - remaining;
                    remaining = 0;
                    ++i;
                }
            } else {
                ++i;
            }
        }
    }

    /// @notice Removes shares from stake entries regardless of lock status (used in emergency paths).
    /// @dev Swap-and-pop for full consumption; partial consumption reduces the entry in-place.
    /// @param staker Address whose stake entries are modified.
    /// @param shares Number of shares to remove.
    function _removeAnySharesFor(address staker, uint256 shares) internal {
        Stake[] storage userStakes = stakes[staker];
        uint256 remaining = shares;

        for (uint256 i = 0; i < userStakes.length && remaining > 0;) {
            uint256 stakeShares = userStakes[i].shares;
            if (stakeShares <= remaining) {
                remaining -= stakeShares;
                userStakes[i] = userStakes[userStakes.length - 1];
                userStakes.pop();
            } else {
                userStakes[i].shares = stakeShares - remaining;
                remaining = 0;
                ++i;
            }
        }
    }

    // ============================== Internal Utils ==============================

    /// @notice Internal setter for the treasury address.
    /// @param _treasury New treasury address.
    function _setTreasury(address _treasury) internal {
        treasury = _treasury;
        emit TreasurySet(_treasury);
    }
}
