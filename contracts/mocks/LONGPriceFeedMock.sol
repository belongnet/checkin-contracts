// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.27;

contract LONGPriceFeedMockV1 {
    function latestAnswer() external pure returns (int256) {
        return 50000000;
    }

    function latestRound() external pure returns (uint256) {
        return 2025;
    }

    function latestTimestamp() external view returns (uint256) {
        return block.timestamp;
    }

    function decimals() external pure returns (uint8) {
        return 8;
    }
}

contract LONGPriceFeedMockV2 {
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (0, 50000000, 0, block.timestamp, 0);
    }
}

contract LONGPriceFeedMockV3 is LONGPriceFeedMockV1, LONGPriceFeedMockV2 {}
