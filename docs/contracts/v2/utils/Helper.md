# Solidity API

## Helper

Utility library for percentage math, standardizing token amounts to 27 decimals,
        staking tier resolution, address→id mapping, and Chainlink price reads.
@dev
- Standardization uses 27-decimal fixed-point (`BPS`) to avoid precision loss across tokens.
- Price reads support both `latestRoundData()` and legacy `latestAnswer()`.

### IncorrectPriceFeed

```solidity
error IncorrectPriceFeed(address assetPriceFeedAddress)
```

Thrown when a price feed is invalid or returns a non-positive value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assetPriceFeedAddress | address | The provided price feed address. |

### BPS

```solidity
uint256 BPS
```

27-decimal scaling base used for standardization.

### DECIMALS_BY_DEFAULT

```solidity
uint8 DECIMALS_BY_DEFAULT
```

Fallback decimals when a price feed does not expose `decimals()`.

### SCALING_FACTOR

```solidity
uint16 SCALING_FACTOR
```

Scaling factor for percentage math (10_000 == 100%).

### calculateRate

```solidity
function calculateRate(uint256 percentage, uint256 amount) external pure returns (uint256 rate)
```

Computes `percentage` of `amount` with 1e4 scaling.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| percentage | uint256 | Percentage in 1e4 (e.g., 2500 == 25%). |
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
| [0] | uint256 | The uint256 id derived from the address. |

### getStandardizedPrice

```solidity
function getStandardizedPrice(address token, address tokenPriceFeed, uint256 amount) external view returns (uint256 priceAmount)
```

Converts a token amount to a standardized 27-decimal USD value using a price feed.

_`amount` is in the token's native decimals; result is standardized to 27 decimals._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | Token address whose decimals are used for standardization. |
| tokenPriceFeed | address | Chainlink feed for the token/USD price. |
| amount | uint256 | Token amount to convert. |

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
| [0] | uint256 | Standardized amount in 27 decimals. |

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
| [0] | uint256 | Amount converted to token-native decimals. |

