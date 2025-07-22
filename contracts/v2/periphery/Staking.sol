// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Ownable} from "solady/src/auth/Ownable.sol";
import {ERC4626} from "solady/src/tokens/ERC4626.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

contract Staking is ERC4626, Ownable {
    using SafeTransferLib for address;

    struct Stake {
        uint256 amount;
        uint256 timestamp;
    }

    error MinStakePeriodShouldBeGreaterThanZero();
    error MinStakePeriodNotMet();
    error ZeroBalance();

    uint16 public constant SCALING_FACTOR = 10000;

    address private LONG;
    string private _name;
    string private _symbol;

    address public treasury;

    uint256 public minStakePeriod = 1 days;
    uint256 public penaltyPercent = 1000;

    mapping(address staker => Stake[] times) public stakes;

    constructor(
        address _owner,
        address long,
        string memory name_,
        string memory symbol_
    ) {
        LONG = long;
        _name = name_;
        _symbol = symbol_;
        _initializeOwner(_owner);
    }

    function setMinStakePeriod(uint256 period) external onlyOwner {
        require(period > 0, MinStakePeriodShouldBeGreaterThanZero());
        minStakePeriod = period;
    }

    /// Emergency unstake — burns all shares, returns 90%, sends 10% to treasury
    function emergencyUnstake() external {
        uint256 shares = balanceOf(msg.sender);
        require(shares > 0, ZeroBalance());

        uint256 assets = previewRedeem(shares);
        uint256 penalty = (assets * penaltyPercent) / SCALING_FACTOR;
        uint256 payout;
        unchecked {
            payout = assets - penalty;
        }

        _burn(msg.sender, shares);

        delete stakes[msg.sender]; // Wipe stake history

        LONG.safeTransfer(msg.sender, payout);
        LONG.safeTransfer(treasury, penalty);
    }

    /// @dev To be overridden to return the address of the underlying asset.
    ///
    /// - MUST be an ERC20 token contract.
    /// - MUST NOT revert.
    function asset() public view override returns (address) {
        return LONG;
    }

    /// @dev Returns the name of the token.
    function name() public view override returns (string memory) {
        return _name;
    }

    /// @dev Returns the symbol of the token.
    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    function _afterDeposit(uint256 assets, uint256) internal override {
        stakes[msg.sender].push(
            Stake({amount: assets, timestamp: block.timestamp})
        );
    }

    function _beforeWithdraw(uint256 assets, uint256) internal override {
        Stake[] storage userStakes = stakes[msg.sender];

        uint256 unlocked = 0;
        for (uint256 i = 0; i < userStakes.length; ++i) {
            if (block.timestamp >= userStakes[i].timestamp + minStakePeriod) {
                unlocked += userStakes[i].amount;
                return;
            }
        }

        if (unlocked < assets) {
            revert MinStakePeriodNotMet();
        }

        // Remove used unlocked stakes (FIFO order)
        uint256 remaining = assets;
        for (uint256 i = 0; i < userStakes.length && remaining > 0; ) {
            if (block.timestamp >= userStakes[i].timestamp + minStakePeriod) {
                if (userStakes[i].amount <= remaining) {
                    remaining -= userStakes[i].amount;
                    // Delete by swapping with the last
                    userStakes[i] = userStakes[userStakes.length - 1];
                    userStakes.pop();
                    // don't increment i — we just moved a new item to i
                } else {
                    userStakes[i].amount -= remaining;
                    remaining = 0;
                    ++i;
                }
            } else {
                ++i;
            }
        }
    }
}
