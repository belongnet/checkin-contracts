# CLPoolGetters
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-cl/libraries/CLPoolGetters.sol)


## Functions
### getPoolTickInfo


```solidity
function getPoolTickInfo(CLPool.State storage pool, int24 tick) internal view returns (Tick.Info memory);
```

### getPoolBitmapInfo


```solidity
function getPoolBitmapInfo(CLPool.State storage pool, int16 word) internal view returns (uint256 tickBitmap);
```

### getFeeGrowthGlobals


```solidity
function getFeeGrowthGlobals(CLPool.State storage pool)
    internal
    view
    returns (uint256 feeGrowthGlobal0x128, uint256 feeGrowthGlobal1x128);
```

