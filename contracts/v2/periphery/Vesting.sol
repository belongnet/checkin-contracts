// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {UUPSUpgradeable} from "solady/src/utils/UUPSUpgradeable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

contract VestingWalletExtended is Initializable, UUPSUpgradeable, Ownable {
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
    error AllocationNotBalanced(uint256 currentAllocation, uint256 totalAllocation);
    error OverAllocation(uint256 currentAllocation, uint256 totalAllocation);

    // ========= Events =========
    event ERC20Released(address indexed token, uint256 amount);
    event TrancheAdded(uint64 timestamp, uint256 amount);
    event Finalized(uint256 timestamp);

    // ========= Types =========
    struct Tranche {
        uint64 timestamp;
        uint192 amount;
    }

    // ========= Immutables / Config =========

    struct VestingWalletStorage {
        uint64 startTimestamp; // TGE
        uint64 cliffDurationSeconds; // start + cliffDuration
        uint64 durationSeconds; // linear duration (sec)
        address token;
        address beneficiary;
        uint256 totalAllocation;
        uint256 tgeAmount; // one-off at start
        uint256 linearAllocation; // linear part after cliff
    }

    // ========= State =========
    VestingWalletStorage public vestingStorage;
    uint256 public released;
    bool public tranchesConfigurationFinalized;

    Tranche[] public tranches;
    uint256 public tranchesTotal; // ∑ tranche.amount

    // Guard
    modifier notFinalizedTrancheAdding() {
        if (tranchesConfigurationFinalized) revert VestingFinalized();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner, VestingWalletStorage calldata vestingParams) external initializer {
        require(vestingParams.token != address(0) && vestingParams.beneficiary != address(0), ZeroAddressPassed());
        require(
            vestingParams.durationSeconds == 0 || vestingParams.cliffDurationSeconds + vestingParams.durationSeconds > 0,
            BadDurations(vestingParams.durationSeconds, vestingParams.cliffDurationSeconds)
        );
        require(
            vestingParams.tgeAmount + vestingParams.linearAllocation <= vestingParams.totalAllocation,
            AllocationMismatch(vestingParams.tgeAmount, vestingParams.linearAllocation, vestingParams.totalAllocation)
        );

        vestingStorage = vestingParams;
        _initializeOwner(_owner);
    }

    function addTranche(uint64 timestamp, uint256 amount) external onlyOwner notFinalizedTrancheAdding {
        require(timestamp >= start(), TrancheBeforeStart(timestamp));
        require(timestamp <= end(), TrancheAfterEnd(timestamp));

        Tranche[] storage _tranches = tranches;

        if (_tranches.length > 0) {
            require(timestamp >= _tranches[_tranches.length - 1].timestamp, NonMonotonic(timestamp));
        }

        uint256 _tranchesTotal = tranchesTotal + amount;
        uint256 _totalAllocation = vestingStorage.totalAllocation;

        uint256 _currentAllocation = vestingStorage.tgeAmount + vestingStorage.linearAllocation + _tranchesTotal;
        require(_currentAllocation <= _totalAllocation, OverAllocation(_currentAllocation, _totalAllocation));

        tranchesTotal = _tranchesTotal;
        _tranches.push(Tranche(timestamp, amount));

        emit TrancheAdded(timestamp, amount);
    }

    function release() external {
        uint256 _released = released;
        uint256 amount = vestedAmount(uint64(block.timestamp)) - _released;
        require(amount > 0, NothingToRelease());
        address _token = vestingStorage.token;

        _released += amount;
        released = _released;

        _token.safeTransfer(vestingStorage.beneficiary, amount);

        emit ERC20Released(_token, amount);
    }

    function finalizeTranchesConfiguration() external onlyOwner notFinalizedTrancheAdding {
        uint256 _totalAllocation = vestingStorage.totalAllocation;

        uint256 _currentAllocation = vestingStorage.tgeAmount + vestingStorage.linearAllocation + tranchesTotal;
        require(_currentAllocation == _totalAllocation, AllocationNotBalanced(_currentAllocation, _totalAllocation));

        tranchesConfigurationFinalized = true;
        emit Finalized(block.timestamp);
    }

    function vestedAmount(uint64 timestamp) public view returns (uint256 total) {
        // 1) TGE
        if (timestamp >= start()) {
            total = vestingStorage.tgeAmount;
        }

        // 2) Step-based
        Tranche[] storage _tranches = tranches;
        uint256 len = _tranches.length;
        for (uint256 i; i < len;) {
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
        uint64 _duration = vestingStorage.durationSeconds;
        uint64 _cliff = cliff();
        if (_duration > 0 && timestamp >= _cliff) {
            uint256 elapsed = uint256(timestamp - _cliff);
            if (elapsed > _duration) {
                elapsed = _duration;
            }
            total += (vestingStorage.linearAllocation * elapsed) / _duration;
        }
    }

    function releasable() public view returns (uint256) {
        return vestedAmount(uint64(block.timestamp)) - released;
    }

    function start() public view returns (uint64) {
        return vestingStorage.startTimestamp;
    }

    function cliff() public view returns (uint64) {
        return vestingStorage.startTimestamp + vestingStorage.cliffDurationSeconds;
    }

    function duration() public view returns (uint64) {
        return vestingStorage.durationSeconds;
    }

    function end() public view returns (uint64) {
        return cliff() + duration();
    }

    function tranchesLength() external view returns (uint256) {
        return tranches.length;
    }

    /// @notice Authorizes UUPS upgrades; restricted to owner.
    /// @param /*newImplementation*/ New implementation (unused in guard).
    function _authorizeUpgrade(address /*newImplementation*/ ) internal override onlyOwner {}
}
