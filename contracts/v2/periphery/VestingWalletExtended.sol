// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {UUPSUpgradeable} from "solady/src/utils/UUPSUpgradeable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

import {VestingWalletInfo} from "../Structures.sol";

contract VestingWalletExtended is Initializable, UUPSUpgradeable, Ownable {
    using SafeTransferLib for address;

    // ========= Errors =========
    error ZeroAddressPassed();
    error NothingToRelease();
    error TrancheBeforeStart(uint64 timestamp);
    error VestingFinalized();
    error VestingNotFinalized();
    error NonMonotonic(uint64 timestamp);
    error TrancheAfterEnd(uint64 timestamp);
    error AllocationNotBalanced(uint256 currentAllocation, uint256 totalAllocation);
    error OverAllocation(uint256 currentAllocation, uint256 totalAllocation);

    // ========= Events =========
    event ERC20Released(address indexed token, uint256 amount);
    event TrancheAdded(Tranche tranche);
    event Finalized(uint256 timestamp);

    // ========= Types =========
    struct Tranche {
        uint64 timestamp; // unlock at (UTC, seconds)
        uint192 amount; // fits 2^192-1
    }

    // ========= Immutables / Config =========

    // ========= State =========

    bool public tranchesConfigurationFinalized;
    uint256 public released;
    uint256 public tranchesTotal; // ∑ tranche.amount

    Tranche[] public tranches;

    VestingWalletInfo public vestingStorage;

    // Guard
    modifier notFinalizedTrancheAdding() {
        if (tranchesConfigurationFinalized) revert VestingFinalized();
        _;
    }

    // Guard
    modifier shouldBeFinalized() {
        if (!tranchesConfigurationFinalized) revert VestingNotFinalized();
        _;
    }

    // ========= Initialize =========

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner, VestingWalletInfo calldata vestingParams) external initializer {
        vestingStorage = vestingParams;
        _initializeOwner(_owner);
    }

    // ========= Mutations =========

    function addTranche(Tranche calldata tranche) external onlyOwner notFinalizedTrancheAdding {
        require(tranche.timestamp >= start(), TrancheBeforeStart(tranche.timestamp));
        require(tranche.timestamp <= end(), TrancheAfterEnd(tranche.timestamp));

        Tranche[] storage _tranches = tranches;
        uint256 tranchesLen = _tranches.length;
        uint64 lastTimestamp = tranchesLen == 0 ? 0 : _tranches[tranchesLen - 1].timestamp;
        if (tranchesLen > 0) {
            require(tranche.timestamp >= lastTimestamp, NonMonotonic(tranche.timestamp));
        }

        uint256 _tranchesTotal = tranchesTotal + tranche.amount;
        uint256 _totalAllocation = vestingStorage.totalAllocation;
        uint256 _currentAllocation = vestingStorage.tgeAmount + vestingStorage.linearAllocation + _tranchesTotal;
        require(_currentAllocation <= _totalAllocation, OverAllocation(_currentAllocation, _totalAllocation));

        tranchesTotal = _tranchesTotal;
        _tranches.push(tranche);

        emit TrancheAdded(tranche);
    }

    function addTranches(Tranche[] calldata tranchesArray) external onlyOwner notFinalizedTrancheAdding {
        uint256 tranchesArrayLength = tranchesArray.length;

        uint64 _start = start();
        uint64 _end = end();

        Tranche[] storage _tranches = tranches;
        uint256 tranchesLen = _tranches.length;
        uint64 lastTimestamp = tranchesLen == 0 ? 0 : _tranches[tranchesLen - 1].timestamp;

        uint256 amountsSum;
        for (uint256 i; i < tranchesArrayLength; ++i) {
            require(tranchesArray[i].timestamp >= _start, TrancheBeforeStart(tranchesArray[i].timestamp));
            require(tranchesArray[i].timestamp <= _end, TrancheAfterEnd(tranchesArray[i].timestamp));
            require(tranchesArray[i].timestamp >= lastTimestamp, NonMonotonic(tranchesArray[i].timestamp));
            lastTimestamp = tranchesArray[i].timestamp;
            amountsSum += tranchesArray[i].amount;
        }

        uint256 _tranchesTotal = tranchesTotal + amountsSum;
        uint256 _totalAllocation = vestingStorage.totalAllocation;
        uint256 _currentAllocation = vestingStorage.tgeAmount + vestingStorage.linearAllocation + _tranchesTotal;
        require(_currentAllocation <= _totalAllocation, OverAllocation(_currentAllocation, _totalAllocation));

        tranchesTotal = _tranchesTotal;
        for (uint256 i; i < tranchesArrayLength; ++i) {
            _tranches.push(tranchesArray[i]);
            emit TrancheAdded(tranchesArray[i]);
        }
    }

    function finalizeTranchesConfiguration() external onlyOwner notFinalizedTrancheAdding {
        uint256 _totalAllocation = vestingStorage.totalAllocation;
        uint256 _currentAllocation = vestingStorage.tgeAmount + vestingStorage.linearAllocation + tranchesTotal;
        require(_currentAllocation == _totalAllocation, AllocationNotBalanced(_currentAllocation, _totalAllocation));

        tranchesConfigurationFinalized = true;
        emit Finalized(block.timestamp);
    }

    function release() external shouldBeFinalized {
        uint256 _released = released;
        uint256 amount = vestedAmount(uint64(block.timestamp)) - _released;
        require(amount > 0, NothingToRelease());
        address _token = vestingStorage.token;

        released = _released + amount;
        _token.safeTransfer(vestingStorage.beneficiary, amount);

        emit ERC20Released(_token, amount);
    }

    // ========= Math =========

    function vestedAmount(uint64 timestamp) public view returns (uint256 total) {
        // 1) TGE
        if (timestamp >= start()) {
            total = vestingStorage.tgeAmount;
        }

        // 2) Step-based (early break)
        uint256 len = tranches.length;
        for (uint256 i; i < len;) {
            Tranche memory tranche = tranches[i];
            if (timestamp >= tranche.timestamp) {
                total += tranche.amount;
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

    // ========= Views =========

    function description() public view returns (string memory) {
        return vestingStorage.description;
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

    // ========= UUPS =========

    /// @notice Authorizes UUPS upgrades; restricted to owner.
    /// @param /*newImplementation*/ New implementation (unused in guard).
    function _authorizeUpgrade(address /*newImplementation*/ ) internal override onlyOwner {}
}
