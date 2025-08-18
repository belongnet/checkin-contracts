// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {MetadataReaderLib} from "solady/src/utils/MetadataReaderLib.sol";
import {FixedPointMathLib} from "solady/src/utils/FixedPointMathLib.sol";

import {ILONGPriceFeed} from "../interfaces/ILONGPriceFeed.sol";
import {StakingTiers} from "../Structures.sol";

/// @title Helper
/// @notice Utility library for percentage math, standardizing token amounts to 27 decimals,
///         staking tier resolution, address→id mapping, and Chainlink price reads.
/// @dev
/// - Standardization uses 27-decimal fixed-point (`BPS`) to avoid precision loss across tokens.
/// - Price reads support both `latestRoundData()` and legacy `latestAnswer()`.
library Helper {
    /// @dev Used for precise calculations.
    using FixedPointMathLib for uint256;
    /// @dev Used for metadata reading (e.g., token decimals).
    using MetadataReaderLib for address;

    /// @notice Thrown when a price feed is invalid or returns a non-positive value.
    /// @param assetPriceFeedAddress The provided price feed address.
    error IncorrectPriceFeed(address assetPriceFeedAddress);

    /// @notice 27-decimal scaling base used for standardization.
    uint256 public constant BPS = 10 ** 27;

    /// @notice Fallback decimals when a price feed does not expose `decimals()`.
    uint8 public constant DECIMALS_BY_DEFAULT = 8;

    /// @notice Scaling factor for percentage math (10_000 == 100%).
    uint16 public constant SCALING_FACTOR = 10000;

    /// @notice Computes `percentage` of `amount` with 1e4 scaling.
    /// @param percentage Percentage in 1e4 (e.g., 2500 == 25%).
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
    /// @return The uint256 id derived from the address.
    function getVenueId(address venue) external pure returns (uint256) {
        return uint256(uint160(venue));
    }

    /// @notice Converts a token amount to a standardized 27-decimal USD value using a price feed.
    /// @dev `amount` is in the token's native decimals; result is standardized to 27 decimals.
    /// @param token Token address whose decimals are used for standardization.
    /// @param tokenPriceFeed Chainlink feed for the token/USD price.
    /// @param amount Token amount to convert.
    /// @return priceAmount Standardized USD amount (27 decimals).
    function getStandardizedPrice(address token, address tokenPriceFeed, uint256 amount)
        external
        view
        returns (uint256 priceAmount)
    {
        (uint256 tokenPriceInUsd, uint8 pfDecimals) = _getPrice(tokenPriceFeed);
        // (amount * price) / 10^priceFeedDecimals
        uint256 usdValue = amount.fullMulDiv(tokenPriceInUsd, 10 ** pfDecimals);
        // Standardize the USD value to 27 decimals
        priceAmount = standardize(token, usdValue);
    }

    /// @notice Standardizes an amount to 27 decimals based on the token's decimals.
    /// @param token Token address to read decimals from.
    /// @param amount Amount in the token's native decimals.
    /// @return Standardized amount in 27 decimals.
    function standardize(address token, uint256 amount) public view returns (uint256) {
        return _standardize(token.readDecimals(), amount);
    }

    /// @notice Converts a 27-decimal standardized amount back to the token's native decimals.
    /// @param token Token address to read decimals from.
    /// @param amount 27-decimal standardized amount.
    /// @return Amount converted to token-native decimals.
    function unstandardize(address token, uint256 amount) public view returns (uint256) {
        return amount.fullMulDiv(10 ** token.readDecimals(), BPS);
    }

    /// @dev Reads price and decimals from a Chainlink feed; supports v2/v3 interfaces.
    /// @param priceFeed Chainlink aggregator proxy address.
    /// @return price Latest positive price as uint256.
    /// @return decimals Feed decimals (or `DECIMALS_BY_DEFAULT` if not exposed).
    function _getPrice(address priceFeed) private view returns (uint256 price, uint8 decimals) {
        int256 intAnswer;
        try ILONGPriceFeed(priceFeed).latestRoundData() returns (uint80, int256 _answer, uint256, uint256, uint80) {
            intAnswer = _answer;
        } catch {
            try ILONGPriceFeed(priceFeed).latestAnswer() returns (int256 _answer) {
                intAnswer = _answer;
            } catch {
                revert IncorrectPriceFeed(priceFeed);
            }
        }
        if (intAnswer <= 0) {
            revert IncorrectPriceFeed(priceFeed);
        }

        price = uint256(intAnswer);

        try ILONGPriceFeed(priceFeed).decimals() returns (uint8 _decimals) {
            decimals = _decimals;
        } catch {
            decimals = DECIMALS_BY_DEFAULT;
        }
    }

    /// @dev Scales `amount` from `decimals` to 27 decimals.
    /// @param decimals Source decimals.
    /// @param amount Amount in `decimals`.
    /// @return 27-decimal standardized amount.
    function _standardize(uint8 decimals, uint256 amount) private pure returns (uint256) {
        return amount.fullMulDiv(BPS, 10 ** decimals);
    }
}
