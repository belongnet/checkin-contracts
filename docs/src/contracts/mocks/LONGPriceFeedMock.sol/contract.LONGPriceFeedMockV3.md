# LONGPriceFeedMockV3
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/mocks/LONGPriceFeedMock.sol)

**Inherits:**
[LONGPriceFeedMockV1](/contracts/mocks/LONGPriceFeedMock.sol/contract.LONGPriceFeedMockV1.md), [LONGPriceFeedMockV2](/contracts/mocks/LONGPriceFeedMock.sol/contract.LONGPriceFeedMockV2.md)

**Title:**
LONGPriceFeedMockV3

Combined mock inheriting both v2 and v3 interfaces.


## Functions
### constructor


```solidity
constructor() LONGPriceFeedMockV2(252525, block.timestamp, 100000000);
```

### decimals

Returns 8 to emulate feed decimals.


```solidity
function decimals() external pure override(LONGPriceFeedMockV1, LONGPriceFeedMockV2) returns (uint8);
```

