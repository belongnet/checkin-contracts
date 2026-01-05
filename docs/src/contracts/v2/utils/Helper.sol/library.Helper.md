# Helper
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/utils/Helper.sol)

**Title:**
Helper

Utility library for percentage math, 27-decimal standardization, staking tier
resolution, address→id mapping, and Chainlink price reads with optional staleness checks.


- Standardization uses 27-decimal fixed-point (`BPS = 1e27`) to avoid precision loss across tokens.
- Price reads support both `latestRoundData()` and legacy `latestAnswer()` interfaces.
- When calling pricing helpers, pass `maxPriceFeedDelay` (in seconds) to enforce feed freshness
relative to `block.timestamp`.


## State Variables
### BPS
27-decimal scaling base used for standardization.


```solidity
uint256 public constant BPS = 10 ** 27
```


### SCALING_FACTOR
Scaling factor for percentage math (10_000 == 100%).


```solidity
uint16 public constant SCALING_FACTOR = 10000
```


## Functions
### calculateRate

Computes `percentage` of `amount` with 1e4 scaling (basis points).


```solidity
function calculateRate(uint256 percentage, uint256 amount) external pure returns (uint256 rate);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`percentage`|`uint256`|Percentage in basis points (e.g., 2500 == 25%).|
|`amount`|`uint256`|The base amount to apply the percentage to.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`rate`|`uint256`|The resulting amount after applying the rate.|


### stakingTiers

Resolves the staking tier based on the staked amount of LONG (18 decimals).


```solidity
function stakingTiers(uint256 amountStaked) external pure returns (StakingTiers tier);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`amountStaked`|`uint256`|Amount of LONG staked (wei).|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`tier`|`StakingTiers`|The enumerated staking tier.|


### getVenueId

Computes a deterministic venue id from an address.


```solidity
function getVenueId(address venue) external pure returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`venue`|`address`|The venue address.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|id The uint256 id derived from the address.|


### getStandardizedPrice

Converts a token amount to a standardized 27-decimal USD value using a price feed.


- `amount` is in the token's native decimals; result is standardized to 27 decimals.
- Enforces price freshness by requiring the feed timestamp to be within `maxPriceFeedDelay` seconds.


```solidity
function getStandardizedPrice(address token, address tokenPriceFeed, uint256 amount, uint256 maxPriceFeedDelay)
    external
    view
    returns (uint256 priceAmount);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|Token address whose decimals are used for standardization.|
|`tokenPriceFeed`|`address`|Chainlink feed for the token/USD price.|
|`amount`|`uint256`|Token amount to convert.|
|`maxPriceFeedDelay`|`uint256`|Maximum allowed age (in seconds) for the feed data.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`priceAmount`|`uint256`|Standardized USD amount (27 decimals).|


### standardize

Standardizes an amount to 27 decimals based on the token's decimals.


```solidity
function standardize(address token, uint256 amount) public view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|Token address to read decimals from.|
|`amount`|`uint256`|Amount in the token's native decimals.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|standardized Standardized amount in 27 decimals.|


### unstandardize

Converts a 27-decimal standardized amount back to the token's native decimals.


```solidity
function unstandardize(address token, uint256 amount) public view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|Token address to read decimals from.|
|`amount`|`uint256`|27-decimal standardized amount.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|unstandardized Amount converted to token-native decimals.|


### amountOutMin

Computes a minimum-out value given a quote and a slippage tolerance.

Returns quote * (1 - slippage/scale), rounded down.
Note: This implementation uses the 27-decimal `BPS` constant as the scaling domain.


```solidity
function amountOutMin(uint256 quote, uint256 slippageBps) internal pure returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`quote`|`uint256`|Quoted output amount prior to slippage.|
|`slippageBps`|`uint256`|Slippage tolerance expressed in the same scaling domain used internally (here: `BPS`).|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|minOut Minimum acceptable output amount after slippage.|


### getPrice

Reads price and decimals from a Chainlink feed; supports v3 `latestRoundData()`
and legacy v2 interfaces via `latestRound()`, `latestTimestamp()`, and `latestAnswer()` fallbacks.
Performs basic validations: non-zero round id, positive answer, and `updatedAt` not older than `maxPriceFeedDelay`.


```solidity
function getPrice(address priceFeed, uint256 maxPriceFeedDelay)
    public
    view
    returns (uint256 price, uint8 decimals);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`priceFeed`|`address`|Chainlink aggregator proxy address.|
|`maxPriceFeedDelay`|`uint256`|Maximum allowed age (in seconds) for the feed data relative to `block.timestamp`.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`price`|`uint256`|Latest positive price as uint256.|
|`decimals`|`uint8`|Feed decimals.|


### _standardize

Scales `amount` from `decimals` to 27 decimals.


```solidity
function _standardize(uint8 decimals, uint256 amount) private pure returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`decimals`|`uint8`|Source decimals.|
|`amount`|`uint256`|Amount in `decimals`.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|standardized 27-decimal standardized amount.|


## Errors
### IncorrectPriceFeed
Reverts when a price feed is invalid, inoperative, or returns a non-positive value.

Used for precise calculations.

Used for metadata reading (e.g., token decimals).


```solidity
error IncorrectPriceFeed(address assetPriceFeedAddress);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`assetPriceFeedAddress`|`address`|The price feed address that failed validation.|

### LatestRoundError
Reverts when `latestRoundData()` cannot be read and a fallback `latestRound()` is also unavailable.


```solidity
error LatestRoundError(address priceFeed);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`priceFeed`|`address`|Price feed address.|

### LatestTimestampError
Reverts when the feed timestamp cannot be retrieved from either v3 or v2-compatible interfaces.


```solidity
error LatestTimestampError(address priceFeed);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`priceFeed`|`address`|Price feed address.|

### LatestAnswerError
Reverts when the feed answer cannot be retrieved from either v3 or v2-compatible interfaces.


```solidity
error LatestAnswerError(address priceFeed);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`priceFeed`|`address`|Price feed address.|

### IncorrectRoundId
Reverts when the reported round id is zero or otherwise invalid.


```solidity
error IncorrectRoundId(address priceFeed, uint256 roundId);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`priceFeed`|`address`|Price feed address.|
|`roundId`|`uint256`|Reported round id.|

### IncorrectLatestUpdatedTimestamp
Reverts when the feed timestamp is zero, in the future, or older than `maxPriceFeedDelay`.


```solidity
error IncorrectLatestUpdatedTimestamp(address priceFeed, uint256 updatedAt);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`priceFeed`|`address`|Price feed address.|
|`updatedAt`|`uint256`|Reported update timestamp.|

### IncorrectAnswer
Reverts when the answered price is non-positive.


```solidity
error IncorrectAnswer(address priceFeed, int256 intAnswer);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`priceFeed`|`address`|Price feed address.|
|`intAnswer`|`int256`|Reported price as an int256.|

