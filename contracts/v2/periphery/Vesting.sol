// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Ownable} from "solady/src/auth/Ownable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

contract VestingWalletExtended is Ownable {
    using SafeTransferLib for address;

    // ========= Errors =========
    error ZeroAddressPassed();
    error NothingToRelease();
    error TrancheBeforeStart(uint64 timestamp);
    error VestingFinalized();
    error NonMonotonic(uint64 timestamp);
    error TrancheAfterEnd(uint64 timestamp);
    error BadDurations(uint64 duration, uint64 cliff);
    error AllocationMismatch(uint256 tge, uint256 linear, uint256 total);
    error AllocationNotBalanced(
        uint256 currentAllocation,
        uint256 totalAllocation
    );
    error OverAllocation(uint256 currentAllocation, uint256 totalAllocation);

    // ========= Events =========
    event ERC20Released(address indexed token, uint256 amount);
    event TrancheAdded(uint64 timestamp, uint256 amount);
    event Finalized(uint256 timestamp);

    // ========= Types =========
    struct Tranche {
        uint64 timestamp;
        uint256 amount;
    }

    // ========= Immutables / Config =========
    address public immutable token;
    address public immutable beneficiary;

    uint64 public immutable start; // TGE
    uint64 public immutable cliff; // start + cliffDuration
    uint64 public immutable duration; // linear duration (sec)
    uint64 public immutable end; // cliff + duration

    uint256 public immutable totalAllocation;
    uint256 public immutable tgeAmount; // one-off at start
    uint256 public immutable linearAllocation; // linear part after cliff

    // ========= State =========
    uint256 public released;
    bool public tranchesConfigurationFinalized;

    Tranche[] public tranches;
    uint256 public tranchesTotal; // ∑ tranche.amount

    // Guard
    modifier notFinalizedTrancheAdding() {
        if (tranchesConfigurationFinalized) revert VestingFinalized();
        _;
    }

    constructor(
        address _token,
        address _beneficiary,
        uint64 _startTimestamp,
        uint64 _cliffDurationSeconds,
        uint64 _durationSeconds,
        uint256 _totalAllocation,
        uint256 _tgeAmount,
        uint256 _linearAllocation
    ) {
        require(
            _token != address(0) && _beneficiary != address(0),
            ZeroAddressPassed()
        );
        require(
            _durationSeconds == 0 ||
                _cliffDurationSeconds + _durationSeconds > 0,
            BadDurations(_durationSeconds, _cliffDurationSeconds)
        );
        require(
            _tgeAmount + _linearAllocation <= _totalAllocation,
            AllocationMismatch(_tgeAmount, _linearAllocation, _totalAllocation)
        );

        uint64 cliff_ = _startTimestamp + _cliffDurationSeconds;

        token = _token;
        beneficiary = _beneficiary;

        start = _startTimestamp;
        cliff = cliff_;
        duration = _durationSeconds;
        end = cliff_ + _durationSeconds;

        totalAllocation = _totalAllocation;
        tgeAmount = _tgeAmount;
        linearAllocation = _linearAllocation;

        _initializeOwner(msg.sender);
    }

    function addTranche(
        uint64 timestamp,
        uint256 amount
    ) external onlyOwner notFinalizedTrancheAdding {
        require(timestamp >= start, TrancheBeforeStart(timestamp));
        require(timestamp <= end, TrancheAfterEnd(timestamp));

        Tranche[] storage _tranches = tranches;

        if (_tranches.length > 0) {
            require(
                timestamp >= _tranches[_tranches.length - 1].timestamp,
                NonMonotonic(timestamp)
            );
        }

        uint256 _tranchesTotal = tranchesTotal + amount;
        uint256 _totalAllocation = totalAllocation;

        uint256 _currentAllocation = tgeAmount +
            linearAllocation +
            _tranchesTotal;
        require(
            _currentAllocation <= _totalAllocation,
            OverAllocation(_currentAllocation, _totalAllocation)
        );

        tranchesTotal = _tranchesTotal;
        _tranches.push(Tranche(timestamp, amount));

        emit TrancheAdded(timestamp, amount);
    }

    function release() external {
        uint256 _released = released;
        uint256 amount = vestedAmount(uint64(block.timestamp)) - _released;
        require(amount > 0, NothingToRelease());
        address _token = token;

        _released += amount;
        released = _released;

        _token.safeTransfer(beneficiary, amount);

        emit ERC20Released(_token, amount);
    }

    function finalizeTranchesConfiguration()
        external
        onlyOwner
        notFinalizedTrancheAdding
    {
        uint256 _totalAllocation = totalAllocation;

        uint256 _currentAllocation = tgeAmount +
            linearAllocation +
            tranchesTotal;
        require(
            _currentAllocation == _totalAllocation,
            AllocationNotBalanced(_currentAllocation, _totalAllocation)
        );

        tranchesConfigurationFinalized = true;
        emit Finalized(block.timestamp);
    }

    function vestedAmount(
        uint64 timestamp
    ) public view returns (uint256 total) {
        // 1) TGE
        if (timestamp >= start) {
            total = tgeAmount;
        }

        // 2) Step-based
        Tranche[] storage _tranches = tranches;
        uint256 len = _tranches.length;
        for (uint256 i; i < len; ) {
            if (timestamp >= _tranches[i].timestamp) {
                total += _tranches[i].amount;
                unchecked {
                    ++i;
                }
            } else {
                break;
            }
        }

        // 3) Linear
        uint64 _duration = duration;
        if (_duration > 0 && timestamp >= cliff) {
            uint256 elapsed = uint256(timestamp - cliff);
            if (elapsed > _duration) {
                elapsed = _duration;
            }
            total += (linearAllocation * elapsed) / _duration;
        }
    }

    function releasable() public view returns (uint256) {
        return vestedAmount(uint64(block.timestamp)) - released;
    }

    function tranchesLength() external view returns (uint256) {
        return tranches.length;
    }
}
