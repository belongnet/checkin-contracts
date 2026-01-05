# LONGPriceFeedMockV1
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/mocks/LONGPriceFeedMock.sol)

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

