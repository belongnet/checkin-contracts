// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Ownable} from "solady/src/auth/Ownable.sol";
import {ERC4626} from "solady/src/tokens/ERC4626.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

contract Staking is ERC4626, Ownable {
    using SafeTransferLib for address;

    error MinStakePeriodShouldBeGreaterThanZero();
    error MinStakePeriodNotMet();
    error PenaltyTooHigh();
    error ZeroReward();

    event RewardsDistributed(uint256 amount);
    event MinStakePeriodSet(uint256 period);
    event PenaltyPecentSet(uint256 percent);
    event TreasurySet(address treasury);
    event EmergencyWithdraw(
        address indexed by,
        address indexed to,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );

    struct Stake {
        uint256 shares;
        uint256 timestamp;
    }

    uint16 public constant SCALING_FACTOR = 10000;
    address private immutable LONG;

    address public treasury;

    uint256 public minStakePeriod = 1 days;
    uint256 public penaltyPercentage = 1000;

    // NOTE: public getter returns (shares, timestamp) for index
    mapping(address staker => Stake[] times) public stakes;

    constructor(address _owner, address _treasury, address long) {
        LONG = long;
        _setTreasury(_treasury);
        _initializeOwner(_owner);
    }

    function setMinStakePeriod(uint256 period) external onlyOwner {
        require(period > 0, MinStakePeriodShouldBeGreaterThanZero());
        minStakePeriod = period;
        emit MinStakePeriodSet(period);
    }

    function setpenaltyPercentage(uint256 newPercent) external onlyOwner {
        require(newPercent <= SCALING_FACTOR, PenaltyTooHigh());
        penaltyPercentage = newPercent;
        emit PenaltyPecentSet(newPercent);
    }

    function setTreasury(address _treasury) external onlyOwner {
        _setTreasury(_treasury);
    }

    function distributeRewards(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroReward();
        LONG.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardsDistributed(amount);
    }

    function emergencyWithdraw(
        uint256 assets,
        address to,
        address _owner
    ) external returns (uint256 shares) {
        if (assets > maxWithdraw(_owner)) revert WithdrawMoreThanMax();
        shares = previewWithdraw(assets);
        _emergencyWithdraw(msg.sender, to, _owner, assets, shares);
    }

    function emergencyRedeem(
        uint256 shares,
        address to,
        address _owner
    ) external returns (uint256 assets) {
        if (shares > maxRedeem(_owner)) revert RedeemMoreThanMax();
        assets = previewRedeem(shares);
        _emergencyWithdraw(msg.sender, to, _owner, assets, shares);
    }

    /// Emergency unstake — burns shares, returns (assets - penalty), sends penalty to treasury
    function _emergencyWithdraw(
        address by,
        address to,
        address _owner,
        uint256 assets,
        uint256 shares
    ) internal {
        uint256 penalty = (assets * penaltyPercentage) / SCALING_FACTOR;
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

    /// @dev To be overridden to return the address of the underlying asset.
    function asset() public view override returns (address) {
        return LONG;
    }

    function name() public pure override returns (string memory) {
        return "LONG Staking";
    }

    function symbol() public pure override returns (string memory) {
        return "sLONG";
    }

    function _afterDeposit(
        uint256 /*assets*/,
        uint256 shares
    ) internal override {
        stakes[msg.sender].push(
            Stake({shares: shares, timestamp: block.timestamp})
        );
    }

    // CHANGED: compare required `shares` (not `assets`) against unlocked shares
    function _beforeWithdraw(
        uint256 /*assets*/,
        uint256 shares
    ) internal override {
        Stake[] memory userStakes = stakes[msg.sender];
        uint256 _minStakePeriod = minStakePeriod;

        uint256 unlockedShares = 0;
        for (uint256 i = 0; i < userStakes.length; ++i) {
            if (block.timestamp >= userStakes[i].timestamp + _minStakePeriod) {
                unlockedShares += userStakes[i].shares;
            }
        }

        if (unlockedShares < shares) revert MinStakePeriodNotMet();

        _removeUnlockedSharesFor(msg.sender, shares);
    }

    function _removeUnlockedSharesFor(address staker, uint256 shares) internal {
        Stake[] storage userStakes = stakes[staker];
        uint256 _minStakePeriod = minStakePeriod;
        uint256 remaining = shares;

        for (uint256 i = 0; i < userStakes.length && remaining > 0; ) {
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

    function _removeAnySharesFor(address staker, uint256 shares) internal {
        Stake[] storage userStakes = stakes[staker];
        uint256 remaining = shares;

        for (uint256 i = 0; i < userStakes.length && remaining > 0; ) {
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

    function _setTreasury(address _treasury) internal {
        treasury = _treasury;
        emit TreasurySet(_treasury);
    }
}
