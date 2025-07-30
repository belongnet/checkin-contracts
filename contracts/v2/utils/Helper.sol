// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {MetadataReaderLib} from "solady/src/utils/MetadataReaderLib.sol";
import {FixedPointMathLib} from "solady/src/utils/FixedPointMathLib.sol";

import {ILONGPriceFeed} from "../interfaces/ILONGPriceFeed.sol";
import {StakingTiers} from "../Structures.sol";

library Helper {
    /// @dev Used for precise calculations.
    using FixedPointMathLib for uint256;
    /// @dev Used for metadata reading.
    using MetadataReaderLib for address;

    /// @notice Indicates the price feed address is incorrect.
    error IncorrectPriceFeed(address assetPriceFeedAddress);

    /// @notice Base points used to standardize decimals.
    uint256 public constant BPS = 10 ** 27;

    /// @notice Default number of decimals used in standardization.
    uint8 public constant DECIMALS_BY_DEFAULT = 8;

    /// @notice The scaling factor for referral percentages.
    uint16 public constant SCALING_FACTOR = 10000;

    function calculateRate(
        uint256 percentage,
        uint256 amount
    ) external pure returns (uint256 rate) {
        rate = (amount * percentage) / SCALING_FACTOR;
    }

    function stakingTiers(
        uint256 amountStaked
    ) external pure returns (StakingTiers tier) {
        if (amountStaked < 50000) {
            return StakingTiers.NoStakes;
        } else if (amountStaked >= 50000 && amountStaked < 250000) {
            return StakingTiers.BronzeTier;
        } else if (amountStaked >= 250000 && amountStaked < 500000) {
            return StakingTiers.SilverTier;
        } else if (amountStaked >= 500000 && amountStaked < 1000000) {
            return StakingTiers.GoldTier;
        }
        return StakingTiers.PlatinumTier;
    }

    function getVenueId(address venue) external pure returns (uint256) {
        return uint256(uint160(venue));
    }

    function getStandardizedPrice(
        address token,
        address tokenPriceFeed,
        uint256 amount
    ) external view returns (uint256 priceAmount) {
        (uint256 tokenPriceInUsd, uint8 pfDecimals) = _getPrice(tokenPriceFeed);
        // Calculate USD value: (amount * price) / 10^priceFeedDecimals
        uint256 usdValue = amount.fullMulDiv(tokenPriceInUsd, 10 ** pfDecimals);

        // Standardize the USD value to 27 decimals
        priceAmount = standardize(token, usdValue);
    }

    function standardize(
        address token,
        uint256 amount
    ) public view returns (uint256) {
        return _standardize(token.readDecimals(), amount);
    }

    function unstandardize(
        address token,
        uint256 amount
    ) public view returns (uint256) {
        return amount.fullMulDiv(10 ** token.readDecimals(), BPS);
    }

    function _getPrice(
        address priceFeed
    ) private view returns (uint256 price, uint8 decimals) {
        int256 intAnswer;
        try ILONGPriceFeed(priceFeed).latestRoundData() returns (
            uint80,
            int256 _answer,
            uint256,
            uint256,
            uint80
        ) {
            intAnswer = _answer;
        } catch {
            try ILONGPriceFeed(priceFeed).latestAnswer() returns (
                int256 _answer
            ) {
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

    function _standardize(
        uint8 decimals,
        uint256 amount
    ) private pure returns (uint256) {
        return amount.fullMulDiv(BPS, 10 ** decimals);
    }
}
