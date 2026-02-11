# Solidity API

## ILONGPriceFeed

_Interface for fetching the price of the LONG asset from a Chainlink price feed.
This interface inherits from AggregatorV2V3Interface to interact with Chainlink's price feed data._

## Deployment Notes

- Use a real Chainlink aggregator if available for your network.
- If no aggregator exists, deploy the in-repo `LONGPriceFeed` helper via
  `scripts/mainnet-deployment/belong-checkin/16-deploy-long-price-feed.ts` and
  set `deployments.tokens.longPriceFeed` before running `9-configure-checkin.ts`.
