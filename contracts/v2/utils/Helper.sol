// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {MetadataReaderLib} from "solady/src/utils/MetadataReaderLib.sol";
import {FixedPointMathLib} from "solady/src/utils/FixedPointMathLib.sol";

import {ILONGPriceFeed} from "../interfaces/ILONGPriceFeed.sol";
import {StakingTiers} from "../Structures.sol";

/**
 * @title Helper
 * @notice Utility library for percentage math, 27-decimal standardization, staking tier
 *         resolution, address→id mapping, and Chainlink price reads with optional staleness checks.
 * @dev
 * - Standardization uses 27-decimal fixed-point (`BPS = 1e27`) to avoid precision loss across tokens.
 * - Price reads support both `latestRoundData()` and legacy `latestAnswer()` interfaces.
 * - When calling pricing helpers, pass `maxPriceFeedDelay` (in seconds) to enforce feed freshness
 *   relative to `block.timestamp`.
 */
library Helper {
    /// @dev Used for precise calculations.
    using FixedPointMathLib for uint256;
    /// @dev Used for metadata reading (e.g., token decimals).
    using MetadataReaderLib for address;

    /// @notice Reverts when a provided slippage value exceeds the configured scaling domain.
    error SlippageTooHigh();

    /// @notice Reverts when a price feed is invalid, inoperative, or returns a non-positive value.
    /// @param assetPriceFeedAddress The price feed address that failed validation.
    error IncorrectPriceFeed(address assetPriceFeedAddress);
    /// @notice Reverts when `latestRoundData()` cannot be read and a fallback `latestRound()` is also unavailable.
    /// @param priceFeed Price feed address.
    error LatestRoundError(address priceFeed);
    /// @notice Reverts when the feed timestamp cannot be retrieved from either v3 or v2-compatible interfaces.
    /// @param priceFeed Price feed address.
    error LatestTimestampError(address priceFeed);
    /// @notice Reverts when the feed answer cannot be retrieved from either v3 or v2-compatible interfaces.
    /// @param priceFeed Price feed address.
    error LatestAnswerError(address priceFeed);
    /// @notice Reverts when the reported round id is zero or otherwise invalid.
    /// @param priceFeed Price feed address.
    /// @param roundId Reported round id.
    error IncorrectRoundId(address priceFeed, uint256 roundId);
    /// @notice Reverts when the feed timestamp is zero, in the future, or older than `maxPriceFeedDelay`.
    /// @param priceFeed Price feed address.
    /// @param updatedAt Reported update timestamp.
    error IncorrectLatestUpdatedTimestamp(address priceFeed, uint256 updatedAt);
    /// @notice Reverts when the answered price is non-positive.
    /// @param priceFeed Price feed address.
    /// @param intAnswer Reported price as an int256.
    error IncorrectAnswer(address priceFeed, int256 intAnswer);

    /// @notice 27-decimal scaling base used for standardization.
    uint256 public constant BPS = 10 ** 27;

    /// @notice Scaling factor for percentage math (10_000 == 100%).
    uint16 public constant SCALING_FACTOR = 10000;

    /// @notice Computes `percentage` of `amount` with 1e4 scaling (basis points).
    /// @param percentage Percentage in basis points (e.g., 2500 == 25%).
    /// @param amount The base amount to apply the percentage to.
    /// @return rate The resulting amount after applying the rate.
    function calculateRate(uint256 percentage, uint256 amount) external pure returns (uint256 rate) {
        rate = (amount * percentage) / SCALING_FACTOR;
    }

    /// @notice Resolves the staking tier based on the staked amount of LONG (18 decimals).
    /// @param amountStaked Amount of LONG staked (wei).
    /// @return tier The enumerated staking tier.
    function stakingTiers(uint256 amountStaked) external pure returns (StakingTiers tier) {
        if (amountStaked < 50000e18) {
            return StakingTiers.NoStakes;
        } else if (amountStaked >= 50000e18 && amountStaked < 250000e18) {
            return StakingTiers.BronzeTier;
        } else if (amountStaked >= 250000e18 && amountStaked < 500000e18) {
            return StakingTiers.SilverTier;
        } else if (amountStaked >= 500000e18 && amountStaked < 1000000e18) {
            return StakingTiers.GoldTier;
        }
        return StakingTiers.PlatinumTier;
    }

    /// @notice Computes a deterministic venue id from an address.
    /// @param venue The venue address.
    /// @return id The uint256 id derived from the address.
    function getVenueId(address venue) external pure returns (uint256) {
        return uint256(uint160(venue));
    }

    /// @notice Converts a token amount to a standardized 27-decimal USD value using a price feed.
    /// @dev
    /// - `amount` is in the token's native decimals; result is standardized to 27 decimals.
    /// - Enforces price freshness by requiring the feed timestamp to be within `maxPriceFeedDelay` seconds.
    /// @param token Token address whose decimals are used for standardization.
    /// @param tokenPriceFeed Chainlink feed for the token/USD price.
    /// @param amount Token amount to convert.
    /// @param maxPriceFeedDelay Maximum allowed age (in seconds) for the feed data.
    /// @return priceAmount Standardized USD amount (27 decimals).
    function getStandardizedPrice(address token, address tokenPriceFeed, uint256 amount, uint256 maxPriceFeedDelay)
        external
        view
        returns (uint256 priceAmount)
    {
        (uint256 tokenPriceInUsd, uint8 pfDecimals) = _getPrice(tokenPriceFeed, maxPriceFeedDelay);
        // (amount * price) / 10^priceFeedDecimals
        uint256 usdValue = amount.fullMulDiv(tokenPriceInUsd, 10 ** pfDecimals);
        // Standardize the USD value to 27 decimals
        priceAmount = standardize(token, usdValue);
    }

    /// @notice Standardizes an amount to 27 decimals based on the token's decimals.
    /// @param token Token address to read decimals from.
    /// @param amount Amount in the token's native decimals.
    /// @return standardized Standardized amount in 27 decimals.
    function standardize(address token, uint256 amount) public view returns (uint256) {
        return _standardize(token.readDecimals(), amount);
    }

    /// @notice Converts a 27-decimal standardized amount back to the token's native decimals.
    /// @param token Token address to read decimals from.
    /// @param amount 27-decimal standardized amount.
    /// @return unstandardized Amount converted to token-native decimals.
    function unstandardize(address token, uint256 amount) public view returns (uint256) {
        return amount.fullMulDiv(10 ** token.readDecimals(), BPS);
    }

    /// @notice Computes a minimum-out value given a quote and a slippage tolerance.
    /// @dev Returns quote * (1 - slippage/scale), rounded down.
    /// Note: This implementation uses the 27-decimal `BPS` constant as the scaling domain.
    /// @param quote Quoted output amount prior to slippage.
    /// @param slippageBps Slippage tolerance expressed in the same scaling domain used internally (here: `BPS`).
    /// @return minOut Minimum acceptable output amount after slippage.
    function amountOutMin(uint256 quote, uint256 slippageBps) internal pure returns (uint256) {
        // multiply first, then divide, to keep precision
        return (quote * (BPS - slippageBps)) / BPS;
    }

    /// @dev Reads price and decimals from a Chainlink feed; supports v3 `latestRoundData()`
    /// and legacy v2 interfaces via `latestRound()`, `latestTimestamp()`, and `latestAnswer()` fallbacks.
    /// Performs basic validations: non-zero round id, positive answer, and `updatedAt` not older than `maxPriceFeedDelay`.
    /// @param priceFeed Chainlink aggregator proxy address.
    /// @param maxPriceFeedDelay Maximum allowed age (in seconds) for the feed data relative to `block.timestamp`.
    /// @return price Latest positive price as uint256.
    /// @return decimals Feed decimals.
    function _getPrice(address priceFeed, uint256 maxPriceFeedDelay)
        private
        view
        returns (uint256 price, uint8 decimals)
    {
        int256 intAnswer;
        uint256 roundId;
        uint256 updatedAt;
        try ILONGPriceFeed(priceFeed).latestRoundData() returns (
            uint80 _roundId, int256 _answer, uint256, uint256 _updatedAt, uint80
        ) {
            roundId = uint256(_roundId);
            updatedAt = _updatedAt;
            intAnswer = _answer;
        } catch {
            try ILONGPriceFeed(priceFeed).latestRound() returns (uint256 _roundId) {
                roundId = _roundId;
            } catch {
                revert LatestRoundError(priceFeed);
            }

            try ILONGPriceFeed(priceFeed).latestTimestamp() returns (uint256 _updatedAt) {
                updatedAt = _updatedAt;
            } catch {
                revert LatestTimestampError(priceFeed);
            }

            try ILONGPriceFeed(priceFeed).latestAnswer() returns (int256 _answer) {
                intAnswer = _answer;
            } catch {
                revert LatestAnswerError(priceFeed);
            }
        }

        try ILONGPriceFeed(priceFeed).decimals() returns (uint8 _decimals) {
            decimals = _decimals;
        } catch {
            revert IncorrectPriceFeed(priceFeed);
        }

        require(roundId > 0, IncorrectRoundId(priceFeed, roundId));
        require(
            updatedAt > 0 && updatedAt <= block.timestamp && block.timestamp - updatedAt <= maxPriceFeedDelay,
            IncorrectLatestUpdatedTimestamp(priceFeed, updatedAt)
        );

        require(intAnswer > 0, IncorrectAnswer(priceFeed, intAnswer));

        price = uint256(intAnswer);
    }

    /// @dev Scales `amount` from `decimals` to 27 decimals.
    /// @param decimals Source decimals.
    /// @param amount Amount in `decimals`.
    /// @return standardized 27-decimal standardized amount.
    function _standardize(uint8 decimals, uint256 amount) private pure returns (uint256) {
        return amount.fullMulDiv(BPS, 10 ** decimals);
    }
}
