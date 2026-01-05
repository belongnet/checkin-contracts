// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Ownable} from "solady/src/auth/Ownable.sol";

import {ILONGPriceFeed} from "../interfaces/ILONGPriceFeed.sol";

/// @title LONGPriceFeed
/// @notice Owner-updated Chainlink-compatible price feed for LONG.
/// @dev Implements AggregatorV2V3Interface and emits standard Chainlink events.
contract LONGPriceFeed is ILONGPriceFeed, Ownable {
    /// @notice Reverts when an invalid owner or answer is provided.
    error ZeroAddressPassed();
    error InvalidAnswer(int256 answer);
    error NoDataPresent(uint80 roundId);

    struct RoundData {
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    uint8 private immutable _decimals;
    string private _description;
    uint256 private immutable _version;

    uint80 private _latestRoundId;
    mapping(uint80 roundId => RoundData data) private _rounds;

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

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external view override returns (string memory) {
        return _description;
    }

    function version() external view override returns (uint256) {
        return _version;
    }

    function getRoundData(uint80 roundId)
        external
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        RoundData memory data = _rounds[roundId];
        if (data.updatedAt == 0) {
            revert NoDataPresent(roundId);
        }
        return (roundId, data.answer, data.startedAt, data.updatedAt, data.answeredInRound);
    }

    function latestRoundData() external view override returns (uint80, int256, uint256, uint256, uint80) {
        RoundData memory data = _rounds[_latestRoundId];
        if (data.updatedAt == 0) {
            revert NoDataPresent(_latestRoundId);
        }
        return (_latestRoundId, data.answer, data.startedAt, data.updatedAt, data.answeredInRound);
    }

    function latestAnswer() external view override returns (int256) {
        return _rounds[_latestRoundId].answer;
    }

    function latestTimestamp() external view override returns (uint256) {
        return _rounds[_latestRoundId].updatedAt;
    }

    function latestRound() external view override returns (uint256) {
        return uint256(_latestRoundId);
    }

    function getAnswer(uint256 roundId) external view override returns (int256) {
        return _rounds[uint80(roundId)].answer;
    }

    function getTimestamp(uint256 roundId) external view override returns (uint256) {
        return _rounds[uint80(roundId)].updatedAt;
    }

    function _pushRound(int256 answer) private returns (uint80 roundId) {
        roundId = _latestRoundId + 1;
        _latestRoundId = roundId;

        uint256 ts = block.timestamp;
        _rounds[roundId] = RoundData({
            answer: answer,
            startedAt: ts,
            updatedAt: ts,
            answeredInRound: roundId
        });

        emit NewRound(roundId, msg.sender, ts);
        emit AnswerUpdated(answer, roundId, ts);
    }
}
