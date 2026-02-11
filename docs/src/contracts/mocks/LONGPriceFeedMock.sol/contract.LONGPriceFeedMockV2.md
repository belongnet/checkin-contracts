# LONGPriceFeedMockV2
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/mocks/LONGPriceFeedMock.sol)

**Title:**
LONGPriceFeedMockV2

Chainlink-like mock exposing v3-style `latestRoundData`.


## State Variables
### _roundId

```solidity
uint80 _roundId
```


### _updatedAt

```solidity
uint256 _updatedAt
```


### _answer

```solidity
int256 _answer
```


## Functions
### constructor


```solidity
constructor(uint80 roundId, uint256 updatedAt, int256 answer) ;
```

### latestRoundData

Returns a fixed price answer (8 decimals) with current timestamp.


```solidity
function latestRoundData()
    external
    view
    returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
```

### decimals

Returns 8 to emulate feed decimals.


```solidity
function decimals() external pure virtual returns (uint8);
```

