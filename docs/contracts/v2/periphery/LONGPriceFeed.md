# Solidity API

## LONGPriceFeed

Owner-updated Chainlink-compatible price feed for LONG.

_Implements AggregatorV2V3Interface and emits standard Chainlink events._

### ZeroAddressPassed

```solidity
error ZeroAddressPassed()
```

Reverts when a required address is zero.

### InvalidAnswer

```solidity
error InvalidAnswer(int256 answer)
```

Reverts when the provided answer is not positive.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| answer | int256 | Proposed answer value. |

### NoDataPresent

```solidity
error NoDataPresent(uint80 roundId)
```

Reverts when the requested round has no data.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | Round id queried. |

### RoundData

Stored data for a single price round.

```solidity
struct RoundData {
  int256 answer;
  uint256 startedAt;
  uint256 updatedAt;
  uint80 answeredInRound;
}
```

### constructor

```solidity
constructor(address owner_, uint8 decimals_, string description_, int256 initialAnswer) public
```

Creates the price feed and optionally seeds the first round.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner_ | address | Owner allowed to publish updates. |
| decimals_ | uint8 | Decimals for the feed (e.g., 8 for USD). |
| description_ | string | Human-readable description (e.g., "LONG / USD"). |
| initialAnswer | int256 | Initial price answer; set to 0 to leave empty. |

### updateAnswer

```solidity
function updateAnswer(int256 answer) external returns (uint80 roundId)
```

Pushes a new price update as a fresh round.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| answer | int256 | The latest price answer (must be > 0). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | The id assigned to the new round. |

### setDescription

```solidity
function setDescription(string description_) external
```

Updates the feed description string.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| description_ | string | New description. |

### decimals

```solidity
function decimals() external view returns (uint8)
```

Returns the feed decimals.

### description

```solidity
function description() external view returns (string)
```

Returns the feed description.

### version

```solidity
function version() external view returns (uint256)
```

Returns the feed version.

### getRoundData

```solidity
function getRoundData(uint80 roundId) external view returns (uint80, int256, uint256, uint256, uint80)
```

Returns round data for a given round id.

_Reverts if the round has no data._

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)
```

Returns the latest round data.

_Reverts if no data exists yet._

### latestAnswer

```solidity
function latestAnswer() external view returns (int256)
```

Returns the latest answer.

_Reverts if no data exists yet._

### latestTimestamp

```solidity
function latestTimestamp() external view returns (uint256)
```

Returns the latest update timestamp.

_Reverts if no data exists yet._

### latestRound

```solidity
function latestRound() external view returns (uint256)
```

Returns the latest round id.

### getAnswer

```solidity
function getAnswer(uint256 roundId) external view returns (int256)
```

Returns the answer for a specific round id.

_Returns zero if round id exists but has no data._

### getTimestamp

```solidity
function getTimestamp(uint256 roundId) external view returns (uint256)
```

Returns the updated timestamp for a specific round id.

_Returns zero if round id exists but has no data._

