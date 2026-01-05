# LONGPriceFeed
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/periphery/LONGPriceFeed.sol)

**Inherits:**
[ILONGPriceFeed](/contracts/v2/interfaces/ILONGPriceFeed.sol/interface.ILONGPriceFeed.md), Ownable

**Title:**
LONGPriceFeed

Owner-updated Chainlink-compatible price feed for LONG.

Implements AggregatorV2V3Interface and emits standard Chainlink events.


## State Variables
### _decimals
Feed decimals (Chainlink-style).


```solidity
uint8 private immutable _decimals
```


### _description
Human-readable feed description.


```solidity
string private _description
```


### _version
Feed version (fixed at 1).


```solidity
uint256 private immutable _version
```


### _latestRoundId
Latest round id stored by this feed.


```solidity
uint80 private _latestRoundId
```


### _rounds
Round id to data mapping.


```solidity
mapping(uint80 roundId => RoundData data) private _rounds
```


## Functions
### constructor

Creates the price feed and optionally seeds the first round.


```solidity
constructor(address owner_, uint8 decimals_, string memory description_, int256 initialAnswer) ;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`owner_`|`address`|Owner allowed to publish updates.|
|`decimals_`|`uint8`|Decimals for the feed (e.g., 8 for USD).|
|`description_`|`string`|Human-readable description (e.g., "LONG / USD").|
|`initialAnswer`|`int256`|Initial price answer; set to 0 to leave empty.|


### updateAnswer

Pushes a new price update as a fresh round.


```solidity
function updateAnswer(int256 answer) external onlyOwner returns (uint80 roundId);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`answer`|`int256`|The latest price answer (must be > 0).|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`roundId`|`uint80`|The id assigned to the new round.|


### setDescription

Updates the feed description string.


```solidity
function setDescription(string calldata description_) external onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`description_`|`string`|New description.|


### decimals

Returns the feed decimals.


```solidity
function decimals() external view override returns (uint8);
```

### description

Returns the feed description.


```solidity
function description() external view override returns (string memory);
```

### version

Returns the feed version.


```solidity
function version() external view override returns (uint256);
```

### getRoundData

Returns round data for a given round id.

Reverts if the round has no data.


```solidity
function getRoundData(uint80 roundId) external view override returns (uint80, int256, uint256, uint256, uint80);
```

### latestRoundData

Returns the latest round data.

Reverts if no data exists yet.


```solidity
function latestRoundData() external view override returns (uint80, int256, uint256, uint256, uint80);
```

### latestAnswer

Returns the latest answer.

Reverts if no data exists yet.


```solidity
function latestAnswer() external view override returns (int256);
```

### latestTimestamp

Returns the latest update timestamp.

Reverts if no data exists yet.


```solidity
function latestTimestamp() external view override returns (uint256);
```

### latestRound

Returns the latest round id.


```solidity
function latestRound() external view override returns (uint256);
```

### getAnswer

Returns the answer for a specific round id.

Returns zero if round id exists but has no data.


```solidity
function getAnswer(uint256 roundId) external view override returns (int256);
```

### getTimestamp

Returns the updated timestamp for a specific round id.

Returns zero if round id exists but has no data.


```solidity
function getTimestamp(uint256 roundId) external view override returns (uint256);
```

### _pushRound

Internal helper to write and emit a new round.


```solidity
function _pushRound(int256 answer) private returns (uint80 roundId);
```

## Errors
### ZeroAddressPassed
Reverts when a required address is zero.


```solidity
error ZeroAddressPassed();
```

### InvalidAnswer
Reverts when the provided answer is not positive.


```solidity
error InvalidAnswer(int256 answer);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`answer`|`int256`|Proposed answer value.|

### NoDataPresent
Reverts when the requested round has no data.


```solidity
error NoDataPresent(uint80 roundId);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`roundId`|`uint80`|Round id queried.|

## Structs
### RoundData
Stored data for a single price round.


```solidity
struct RoundData {
    /// @notice Price answer for the round.
    int256 answer;
    /// @notice Timestamp when the round started.
    uint256 startedAt;
    /// @notice Timestamp when the round was updated.
    uint256 updatedAt;
    /// @notice Round id that provided the answer.
    uint80 answeredInRound;
}
```

