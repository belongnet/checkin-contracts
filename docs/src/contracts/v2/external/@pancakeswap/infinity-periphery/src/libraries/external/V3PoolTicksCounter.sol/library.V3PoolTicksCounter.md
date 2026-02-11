# V3PoolTicksCounter
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/libraries/external/V3PoolTicksCounter.sol)

Copy from https://github.com/pancakeswap/pancake-v3-contracts/blob/main/projects/router/contracts/libraries/PoolTicksCounter.sol


## Functions
### countInitializedTicksCrossed

This function counts the number of initialized ticks that would incur a gas cost between tickBefore and tickAfter.
When tickBefore and/or tickAfter themselves are initialized, the logic over whether we should count them depends on the
direction of the swap. If we are swapping upwards (tickAfter > tickBefore) we don't want to count tickBefore but we do
want to count tickAfter. The opposite is true if we are swapping downwards.


```solidity
function countInitializedTicksCrossed(IPancakeV3Pool self, int24 tickBefore, int24 tickAfter)
    internal
    view
    returns (uint32 initializedTicksCrossed);
```

### countOneBits


```solidity
function countOneBits(uint256 x) private pure returns (uint16);
```

