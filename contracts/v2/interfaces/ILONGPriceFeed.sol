// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {AggregatorV2V3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV2V3Interface.sol";

/**
 * @title ILONGPriceFeed
 * @dev Interface for fetching the price of the LONG asset from a Chainlink price feed.
 * This interface inherits from AggregatorV2V3Interface to interact with Chainlink's price feed data.
 */
interface ILONGPriceFeed is AggregatorV2V3Interface {}
