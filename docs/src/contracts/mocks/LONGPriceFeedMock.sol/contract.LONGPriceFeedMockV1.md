# LONGPriceFeedMockV1
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/mocks/LONGPriceFeedMock.sol)

**Title:**
LONGPriceFeedMockV1

Chainlink-like mock exposing legacy v2-style getters.


## Functions
### latestAnswer

Returns a fixed price answer (8 decimals).


```solidity
function latestAnswer() external pure returns (int256);
```

### latestRound

Returns a fixed round id.


```solidity
function latestRound() external pure returns (uint256);
```

### latestTimestamp

Returns the current block timestamp as the update time.


```solidity
function latestTimestamp() external view returns (uint256);
```

### decimals

Returns 8 to emulate feed decimals.


```solidity
function decimals() external pure virtual returns (uint8);
```

