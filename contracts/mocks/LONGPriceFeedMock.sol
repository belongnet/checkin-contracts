// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.27;

/// @title LONGPriceFeedMockV1
/// @notice Chainlink-like mock exposing legacy v2-style getters.
contract LONGPriceFeedMockV1 {
    /// @notice Returns a fixed price answer (8 decimals).
    function latestAnswer() external pure returns (int256) {
        return 50000000;
    }

    /// @notice Returns a fixed round id.
    function latestRound() external pure returns (uint256) {
        return 2025;
    }

    /// @notice Returns the current block timestamp as the update time.
    function latestTimestamp() external view returns (uint256) {
        return block.timestamp;
    }

    /// @notice Returns 8 to emulate feed decimals.
    function decimals() external pure virtual returns (uint8) {
        return 8;
    }
}

/// @title LONGPriceFeedMockV2
/// @notice Chainlink-like mock exposing v3-style `latestRoundData`.
contract LONGPriceFeedMockV2 {
    uint80 _roundId;
    uint256 _updatedAt;
    int256 _answer;

    constructor(uint80 roundId, uint256 updatedAt, int256 answer) {
        _roundId = roundId;
        _updatedAt = updatedAt;
        _answer = answer;
    }

    /// @notice Returns a fixed price answer (8 decimals) with current timestamp.
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (_roundId, _answer, 0, _updatedAt, 0);
    }

    /// @notice Returns 8 to emulate feed decimals.
    function decimals() external pure virtual returns (uint8) {
        return 8;
    }
}

/// @title LONGPriceFeedMockV3
/// @notice Combined mock inheriting both v2 and v3 interfaces.
contract LONGPriceFeedMockV3 is LONGPriceFeedMockV1, LONGPriceFeedMockV2 {
    constructor() LONGPriceFeedMockV2(252525, block.timestamp, 50000000) {}

    /// @notice Returns 8 to emulate feed decimals.
    function decimals() external pure override(LONGPriceFeedMockV1, LONGPriceFeedMockV2) returns (uint8) {
        return 8;
    }
}
