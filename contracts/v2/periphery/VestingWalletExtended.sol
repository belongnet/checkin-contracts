// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {UUPSUpgradeable} from "solady/src/utils/UUPSUpgradeable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

import {VestingWalletInfo} from "../Structures.sol";

/// @title VestingWalletExtended
/// @notice Token vesting wallet supporting TGE, linear vesting after cliff, and step-based tranches.
/// @dev
/// - Vesting consists of three parts: one-off TGE at `start`, linear vesting after `cliff`,
///   and optional monotonic time-ordered tranches between `start` and `end`.
/// - Tranche configuration must be finalized so that TGE + linear allocation + tranches
///   exactly equals `totalAllocation` before any release.
/// - Inherits UUPS upgradeability and Solady's `Ownable`/`Initializable`.
contract VestingWalletExtended is Initializable, UUPSUpgradeable, Ownable {
    using SafeTransferLib for address;

    // ========= Errors =========
    /// @notice A zero address was provided where a valid address is required.
    error ZeroAddressPassed();
    /// @notice There is no vested amount available to release at this time.
    error NothingToRelease();
    /// @notice Attempted to add a tranche with timestamp prior to vesting start.
    /// @param timestamp The invalid tranche timestamp.
    error TrancheBeforeStart(uint64 timestamp);
    /// @notice Tranche configuration has already been finalized and can no longer be modified.
    error VestingFinalized();
    /// @notice Tranche configuration is not finalized yet; operation requires finalization.
    error VestingNotFinalized();
    /// @notice Tranche timestamps must be non-decreasing.
    /// @param timestamp The non-monotonic timestamp encountered.
    error NonMonotonic(uint64 timestamp);
    /// @notice Attempted to add a tranche with timestamp after vesting end.
    /// @param timestamp The invalid tranche timestamp.
    error TrancheAfterEnd(uint64 timestamp);
    /// @notice Sum of TGE + linear + tranches does not equal total allocation.
    /// @param currentAllocation The computed current allocation sum.
    /// @param totalAllocation The expected total allocation.
    error AllocationNotBalanced(uint256 currentAllocation, uint256 totalAllocation);
    /// @notice Sum of TGE + linear + tranches exceeds total allocation.
    /// @param currentAllocation The computed current allocation sum.
    /// @param totalAllocation The expected total allocation.
    error OverAllocation(uint256 currentAllocation, uint256 totalAllocation);

    // ========= Events =========
    /// @notice Emitted when tokens are released to the beneficiary.
    /// @param token The ERC-20 token address released.
    /// @param amount The amount of token released.
    event Released(address indexed token, uint256 amount);
    /// @notice Emitted when a tranche is added.
    /// @param tranche The tranche added.
    event TrancheAdded(Tranche tranche);
    /// @notice Emitted when tranche configuration becomes immutable.
    /// @param timestamp The block timestamp when finalized.
    event Finalized(uint256 timestamp);

    // ========= Types =========
    /// @notice A step-based vesting tranche becoming fully vested at `timestamp`.
    struct Tranche {
        /// @notice Unlock timestamp (UTC, seconds since epoch) when `amount` becomes vested.
        uint64 timestamp;
        /// @notice Amount vested at `timestamp`.
        uint192 amount;
    }

    // ========= Immutables / Config =========

    // ========= State =========
    /// @notice Whether tranche configuration has been finalized.
    bool public tranchesConfigurationFinalized;
    /// @notice The total amount already released to the beneficiary.
    uint256 public released;
    /// @notice The sum of all tranche amounts (Σ tranche.amount).
    uint256 public tranchesTotal;

    /// @notice The configured tranches in non-decreasing timestamp order.
    Tranche[] public tranches;

    /// @notice Vesting parameters and metadata.
    VestingWalletInfo public vestingStorage;

    // Guard
    /// @dev Reverts if tranche configuration has already been finalized.
    modifier vestingNotFinalized() {
        if (tranchesConfigurationFinalized) revert VestingFinalized();
        _;
    }

    // Guard
    /// @dev Reverts if tranche configuration is not finalized yet.
    modifier shouldBeFinalized() {
        if (!tranchesConfigurationFinalized) revert VestingNotFinalized();
        _;
    }

    // ========= Initialize =========

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the vesting wallet with the given owner and vesting parameters.
    /// @param _owner Address that will become the contract owner.
    /// @param vestingParams Full vesting configuration (TGE, cliff, linear, tranches metadata).
    function initialize(address _owner, VestingWalletInfo calldata vestingParams) external initializer {
        vestingStorage = vestingParams;
        _initializeOwner(_owner);
    }

    // ========= Mutations =========

    /// @notice Adds a single step-based tranche.
    /// @dev
    /// - Requires timestamp to be within [start, end] and not earlier than the last tranche.
    /// - Updates `tranchesTotal` and emits {TrancheAdded}.
    /// - Reverts if adding this tranche causes overallocation.
    /// @param tranche The tranche to add.
    function addTranche(Tranche calldata tranche) external onlyOwner vestingNotFinalized {
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

    /// @notice Adds multiple step-based tranches in one call.
    /// @dev
    /// - Validates each tranche is within [start, end] and the sequence is non-decreasing.
    /// - Sums amounts to check against `totalAllocation` to prevent overallocation.
    /// - Emits {TrancheAdded} for each tranche.
    /// @param tranchesArray The array of tranches to add (must be time-ordered or equal).
    function addTranches(Tranche[] calldata tranchesArray) external onlyOwner vestingNotFinalized {
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

    /// @notice Finalizes tranche configuration; makes vesting schedule immutable.
    /// @dev Ensures TGE + linear + tranches equals `totalAllocation` before finalization.
    function finalizeTranchesConfiguration() external onlyOwner vestingNotFinalized {
        uint256 _totalAllocation = vestingStorage.totalAllocation;
        uint256 _currentAllocation = vestingStorage.tgeAmount + vestingStorage.linearAllocation + tranchesTotal;
        require(_currentAllocation == _totalAllocation, AllocationNotBalanced(_currentAllocation, _totalAllocation));

        tranchesConfigurationFinalized = true;
        emit Finalized(block.timestamp);
    }

    /// @notice Releases all currently vested, unreleased tokens to the beneficiary.
    /// @dev Computes `vestedAmount(now) - released` and transfers that delta.
    /// @custom:reverts NothingToRelease If there is no amount to release.
    function release() external shouldBeFinalized {
        uint256 _released = released;
        uint256 amount = vestedAmount(uint64(block.timestamp)) - _released;
        require(amount > 0, NothingToRelease());
        address _token = vestingStorage.token;

        released = _released + amount;
        _token.safeTransfer(vestingStorage.beneficiary, amount);

        emit Released(_token, amount);
    }

    // ========= Math =========

    /// @notice Returns the total vested amount by a given timestamp.
    /// @dev Sums TGE (if past start), all fully vested tranches by `timestamp`, and linear portion after `cliff`.
    /// @param timestamp The timestamp to evaluate vesting at (seconds since epoch).
    /// @return total The total amount vested by `timestamp`.
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

    /// @notice Returns the currently releasable amount (vested minus already released).
    /// @return The amount that can be released at the current block timestamp.
    function releasable() public view returns (uint256) {
        return vestedAmount(uint64(block.timestamp)) - released;
    }

    // ========= Views =========

    /// @notice Human-readable vesting description.
    /// @return The description string stored in vesting parameters.
    function description() public view returns (string memory) {
        return vestingStorage.description;
    }

    /// @notice Vesting start timestamp (TGE).
    /// @return The start timestamp.
    function start() public view returns (uint64) {
        return vestingStorage.startTimestamp;
    }

    /// @notice Vesting cliff timestamp (`start` + `cliffDurationSeconds`).
    /// @return The cliff timestamp.
    function cliff() public view returns (uint64) {
        return vestingStorage.startTimestamp + vestingStorage.cliffDurationSeconds;
    }

    /// @notice Linear vesting duration in seconds.
    /// @return The linear duration.
    function duration() public view returns (uint64) {
        return vestingStorage.durationSeconds;
    }

    /// @notice Vesting end timestamp (`cliff` + `duration`).
    /// @return The end timestamp.
    function end() public view returns (uint64) {
        return cliff() + duration();
    }

    /// @notice Number of configured tranches.
    /// @return The length of the `tranches` array.
    function tranchesLength() external view returns (uint256) {
        return tranches.length;
    }

    // ========= UUPS =========

    /// @notice Authorizes UUPS upgrades; restricted to owner.
    /// @param /*newImplementation*/ New implementation address (unused in guard).
    function _authorizeUpgrade(address /*newImplementation*/ ) internal override onlyOwner {}
}
