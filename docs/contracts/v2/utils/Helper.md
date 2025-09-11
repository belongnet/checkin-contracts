# Solidity API

## Helper

Utility library for percentage math, 27-decimal standardization, staking tier
        resolution, address→id mapping, and Chainlink price reads with optional staleness checks.
@dev
- Standardization uses 27-decimal fixed-point (`BPS = 1e27`) to avoid precision loss across tokens.
- Price reads support both `latestRoundData()` and legacy `latestAnswer()` interfaces.
- When calling pricing helpers, pass `maxPriceFeedDelay` (in seconds) to enforce feed freshness
  relative to `block.timestamp`.

### IncorrectPriceFeed

```solidity
error IncorrectPriceFeed(address assetPriceFeedAddress)
```

Reverts when a price feed is invalid, inoperative, or returns a non-positive value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assetPriceFeedAddress | address | The price feed address that failed validation. |

### LatestRoundError

```solidity
error LatestRoundError(address priceFeed)
```

Reverts when `latestRoundData()` cannot be read and a fallback `latestRound()` is also unavailable.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeed | address | Price feed address. |

### LatestTimestampError

```solidity
error LatestTimestampError(address priceFeed)
```

Reverts when the feed timestamp cannot be retrieved from either v3 or v2-compatible interfaces.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeed | address | Price feed address. |

### LatestAnswerError

```solidity
error LatestAnswerError(address priceFeed)
```

Reverts when the feed answer cannot be retrieved from either v3 or v2-compatible interfaces.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeed | address | Price feed address. |

### IncorrectRoundId

```solidity
error IncorrectRoundId(address priceFeed, uint256 roundId)
```

Reverts when the reported round id is zero or otherwise invalid.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeed | address | Price feed address. |
| roundId | uint256 | Reported round id. |

### IncorrectLatestUpdatedTimestamp

```solidity
error IncorrectLatestUpdatedTimestamp(address priceFeed, uint256 updatedAt)
```

Reverts when the feed timestamp is zero, in the future, or older than `maxPriceFeedDelay`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeed | address | Price feed address. |
| updatedAt | uint256 | Reported update timestamp. |

### IncorrectAnswer

```solidity
error IncorrectAnswer(address priceFeed, int256 intAnswer)
```

Reverts when the answered price is non-positive.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeed | address | Price feed address. |
| intAnswer | int256 | Reported price as an int256. |

### BPS

```solidity
uint256 BPS
```

27-decimal scaling base used for standardization.

### SCALING_FACTOR

```solidity
uint16 SCALING_FACTOR
```

Scaling factor for percentage math (10_000 == 100%).

### calculateRate

```solidity
function calculateRate(uint256 percentage, uint256 amount) external pure returns (uint256 rate)
```

Computes `percentage` of `amount` with 1e4 scaling (basis points).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| percentage | uint256 | Percentage in basis points (e.g., 2500 == 25%). |
| amount | uint256 | The base amount to apply the percentage to. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| rate | uint256 | The resulting amount after applying the rate. |

### stakingTiers

```solidity
function stakingTiers(uint256 amountStaked) external pure returns (enum StakingTiers tier)
```

Resolves the staking tier based on the staked amount of LONG (18 decimals).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountStaked | uint256 | Amount of LONG staked (wei). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| tier | enum StakingTiers | The enumerated staking tier. |

### getVenueId

```solidity
function getVenueId(address venue) external pure returns (uint256)
```

Computes a deterministic venue id from an address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venue | address | The venue address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | id The uint256 id derived from the address. |

### getStandardizedPrice

```solidity
function getStandardizedPrice(address token, address tokenPriceFeed, uint256 amount, uint256 maxPriceFeedDelay) external view returns (uint256 priceAmount)
```

Converts a token amount to a standardized 27-decimal USD value using a price feed.
@dev
- `amount` is in the token's native decimals; result is standardized to 27 decimals.
- Enforces price freshness by requiring the feed timestamp to be within `maxPriceFeedDelay` seconds.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | Token address whose decimals are used for standardization. |
| tokenPriceFeed | address | Chainlink feed for the token/USD price. |
| amount | uint256 | Token amount to convert. |
| maxPriceFeedDelay | uint256 | Maximum allowed age (in seconds) for the feed data. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceAmount | uint256 | Standardized USD amount (27 decimals). |

### standardize

```solidity
function standardize(address token, uint256 amount) public view returns (uint256)
```

Standardizes an amount to 27 decimals based on the token's decimals.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | Token address to read decimals from. |
| amount | uint256 | Amount in the token's native decimals. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | standardized Standardized amount in 27 decimals. |

### unstandardize

```solidity
function unstandardize(address token, uint256 amount) public view returns (uint256)
```

Converts a 27-decimal standardized amount back to the token's native decimals.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | Token address to read decimals from. |
| amount | uint256 | 27-decimal standardized amount. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | unstandardized Amount converted to token-native decimals. |

### amountOutMin

```solidity
function amountOutMin(uint256 quote, uint256 slippageBps) internal pure returns (uint256)
```

Computes a minimum-out value given a quote and a slippage tolerance.

_Returns quote * (1 - slippage/scale), rounded down.
Note: This implementation uses the 27-decimal `BPS` constant as the scaling domain._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| quote | uint256 | Quoted output amount prior to slippage. |
| slippageBps | uint256 | Slippage tolerance expressed in the same scaling domain used internally (here: `BPS`). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | minOut Minimum acceptable output amount after slippage. |

### getPrice

```solidity
function getPrice(address priceFeed, uint256 maxPriceFeedDelay) public view returns (uint256 price, uint8 decimals)
```

_Reads price and decimals from a Chainlink feed; supports v3 `latestRoundData()`
and legacy v2 interfaces via `latestRound()`, `latestTimestamp()`, and `latestAnswer()` fallbacks.
Performs basic validations: non-zero round id, positive answer, and `updatedAt` not older than `maxPriceFeedDelay`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeed | address | Chainlink aggregator proxy address. |
| maxPriceFeedDelay | uint256 | Maximum allowed age (in seconds) for the feed data relative to `block.timestamp`. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| price | uint256 | Latest positive price as uint256. |
| decimals | uint8 | Feed decimals. |

