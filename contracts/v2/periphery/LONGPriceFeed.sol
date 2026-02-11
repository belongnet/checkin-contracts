// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Ownable} from "solady/src/auth/Ownable.sol";

import {ILONGPriceFeed} from "../interfaces/ILONGPriceFeed.sol";

/// @title LONGPriceFeed
/// @notice Owner-updated Chainlink-compatible price feed for LONG.
/// @dev Implements AggregatorV2V3Interface and emits standard Chainlink events.
contract LONGPriceFeed is ILONGPriceFeed, Ownable {
    /// @notice Reverts when a required address is zero.
    error ZeroAddressPassed();
    /// @notice Reverts when the provided answer is not positive.
    /// @param answer Proposed answer value.
    error InvalidAnswer(int256 answer);
    /// @notice Reverts when the requested round has no data.
    /// @param roundId Round id queried.
    error NoDataPresent(uint80 roundId);

    /// @notice Stored data for a single price round.
    struct RoundData {
        /// @notice Price answer for the round.
        int256 answer;
        /// @notice Timestamp when the round started.
        uint256 startedAt;
        /// @notice Timestamp when the round was updated.
        uint256 updatedAt;
        /// @notice Round id that provided the answer.
        uint80 answeredInRound;
    }

    /// @notice Feed decimals (Chainlink-style).
    uint8 private immutable _decimals;
    /// @notice Human-readable feed description.
    string private _description;
    /// @notice Feed version (fixed at 1).
    uint256 private immutable _version;

    /// @notice Latest round id stored by this feed.
    uint80 private _latestRoundId;
    /// @notice Round id to data mapping.
    mapping(uint80 roundId => RoundData data) private _rounds;

    /// @notice Creates the price feed and optionally seeds the first round.
    /// @param owner_ Owner allowed to publish updates.
    /// @param decimals_ Decimals for the feed (e.g., 8 for USD).
    /// @param description_ Human-readable description (e.g., "LONG / USD").
    /// @param initialAnswer Initial price answer; set to 0 to leave empty.
    constructor(address owner_, uint8 decimals_, string memory description_, int256 initialAnswer) {
        if (owner_ == address(0)) {
            revert ZeroAddressPassed();
        }
        _initializeOwner(owner_);
        _decimals = decimals_;
        _description = description_;
        _version = 1;

        if (initialAnswer > 0) {
            _pushRound(initialAnswer);
        }
    }

    /// @notice Pushes a new price update as a fresh round.
    /// @param answer The latest price answer (must be > 0).
    /// @return roundId The id assigned to the new round.
    function updateAnswer(int256 answer) external onlyOwner returns (uint80 roundId) {
        if (answer <= 0) {
            revert InvalidAnswer(answer);
        }
        roundId = _pushRound(answer);
    }

    /// @notice Updates the feed description string.
    /// @param description_ New description.
    function setDescription(string calldata description_) external onlyOwner {
        _description = description_;
    }

    /// @notice Returns the feed decimals.
    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    /// @notice Returns the feed description.
    function description() external view override returns (string memory) {
        return _description;
    }

    /// @notice Returns the feed version.
    function version() external view override returns (uint256) {
        return _version;
    }

    /// @notice Returns round data for a given round id.
    /// @dev Reverts if the round has no data.
    function getRoundData(uint80 roundId) external view override returns (uint80, int256, uint256, uint256, uint80) {
        RoundData memory data = _rounds[roundId];
        if (data.updatedAt == 0) {
            revert NoDataPresent(roundId);
        }
        return (roundId, data.answer, data.startedAt, data.updatedAt, data.answeredInRound);
    }

    /// @notice Returns the latest round data.
    /// @dev Reverts if no data exists yet.
    function latestRoundData() external view override returns (uint80, int256, uint256, uint256, uint80) {
        RoundData memory data = _rounds[_latestRoundId];
        if (data.updatedAt == 0) {
            revert NoDataPresent(_latestRoundId);
        }
        return (_latestRoundId, data.answer, data.startedAt, data.updatedAt, data.answeredInRound);
    }

    /// @notice Returns the latest answer.
    /// @dev Reverts if no data exists yet.
    function latestAnswer() external view override returns (int256) {
        RoundData storage d = _rounds[_latestRoundId];
        require(d.updatedAt != 0, NoDataPresent(_latestRoundId));
        return _rounds[_latestRoundId].answer;
    }

    /// @notice Returns the latest update timestamp.
    /// @dev Reverts if no data exists yet.
    function latestTimestamp() external view override returns (uint256) {
        RoundData storage d = _rounds[_latestRoundId];
        require(d.updatedAt != 0, NoDataPresent(_latestRoundId));
        return _rounds[_latestRoundId].updatedAt;
    }

    /// @notice Returns the latest round id.
    function latestRound() external view override returns (uint256) {
        return uint256(_latestRoundId);
    }

    /// @notice Returns the answer for a specific round id.
    /// @dev Returns zero if round id exists but has no data.
    function getAnswer(uint256 roundId) external view override returns (int256) {
        require(roundId <= type(uint80).max, NoDataPresent(_latestRoundId));
        return _rounds[uint80(roundId)].answer;
    }

    /// @notice Returns the updated timestamp for a specific round id.
    /// @dev Returns zero if round id exists but has no data.
    function getTimestamp(uint256 roundId) external view override returns (uint256) {
        require(roundId <= type(uint80).max, NoDataPresent(_latestRoundId));
        return _rounds[uint80(roundId)].updatedAt;
    }

    /// @dev Internal helper to write and emit a new round.
    function _pushRound(int256 answer) private returns (uint80 roundId) {
        roundId = _latestRoundId + 1;
        _latestRoundId = roundId;

        uint256 ts = block.timestamp;
        _rounds[roundId] = RoundData({answer: answer, startedAt: ts, updatedAt: ts, answeredInRound: roundId});

        emit NewRound(roundId, msg.sender, ts);
        emit AnswerUpdated(answer, roundId, ts);
    }
}
