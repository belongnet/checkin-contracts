# IBinPositionManager
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-bin/interfaces/IBinPositionManager.sol)

**Inherits:**
[IPositionManager](/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/IPositionManager.sol/interface.IPositionManager.md)


## Functions
### binPoolManager


```solidity
function binPoolManager() external view returns (IBinPoolManager);
```

### initializePool

Initialize a infinity PCS bin pool

If the pool is already initialized, this function will not revert


```solidity
function initializePool(PoolKey memory key, uint24 activeId) external payable;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`key`|`PoolKey`|the PoolKey of the pool to initialize|
|`activeId`|`uint24`|the active bin id of the pool|


### positions

Return the position information associated with a given tokenId

Revert if non-existent tokenId


```solidity
function positions(uint256 tokenId) external view returns (PoolKey memory poolKey, uint24 binId);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tokenId`|`uint256`|Id of the token that represent position|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`poolKey`|`PoolKey`|the pool key of the position|
|`binId`|`uint24`|the binId of the position|


## Errors
### IdOverflows

```solidity
error IdOverflows(int256);
```

### IdSlippageCaught

```solidity
error IdSlippageCaught(uint256 activeIdDesired, uint256 idSlippage, uint24 activeId);
```

### AddLiquidityInputActiveIdMismatch

```solidity
error AddLiquidityInputActiveIdMismatch();
```

## Structs
### BinAddLiquidityParams
BinAddLiquidityParams
- amount0: Amount to send for token0
- amount1: Amount to send for token1
- amount0Max: Max amount to send for token0
- amount1Max: Max amount to send for token1
- activeIdDesired: Active id that user wants to add liquidity from
- idSlippage: Number of id that are allowed to slip
- deltaIds: List of delta ids to add liquidity (`deltaId = activeId - desiredId`)
- distributionX: Distribution of tokenX with sum(distributionX) = 1e18 (100%) or 0 (0%)
- distributionY: Distribution of tokenY with sum(distributionY) = 1e18 (100%) or 0 (0%)
- to: Address of recipient
- hookData: Data to pass to the hook


```solidity
struct BinAddLiquidityParams {
    PoolKey poolKey;
    uint128 amount0;
    uint128 amount1;
    uint128 amount0Max;
    uint128 amount1Max;
    uint256 activeIdDesired;
    uint256 idSlippage;
    int256[] deltaIds;
    uint256[] distributionX;
    uint256[] distributionY;
    address to;
    bytes hookData;
}
```

### BinRemoveLiquidityParams
BinRemoveLiquidityParams
- amount0Min: Min amount to receive for token0
- amount1Min: Min amount to receive for token1
- ids: List of bin ids to remove liquidity
- amounts: List of share amount to remove for each bin
- from: Address of NFT holder to burn the NFT
- hookData: Data to pass to the hook


```solidity
struct BinRemoveLiquidityParams {
    PoolKey poolKey;
    uint128 amount0Min;
    uint128 amount1Min;
    uint256[] ids;
    uint256[] amounts;
    address from;
    bytes hookData;
}
```

### BinAddLiquidityFromDeltasParams
BinAddLiquidityFromDeltasParams
- amount0Max: Max amount to send for token0
- amount1Max: Max amount to send for token1
- activeIdDesired: Active id that user wants to add liquidity from
- idSlippage: Number of id that are allowed to slip
- deltaIds: List of delta ids to add liquidity (`deltaId = activeId - desiredId`)
- distributionX: Distribution of tokenX with sum(distributionX) = 1e18 (100%) or 0 (0%)
- distributionY: Distribution of tokenY with sum(distributionY) = 1e18 (100%) or 0 (0%)
- to: Address of recipient
- hookData: Data to pass to the hook


```solidity
struct BinAddLiquidityFromDeltasParams {
    PoolKey poolKey;
    uint128 amount0Max;
    uint128 amount1Max;
    uint256 activeIdDesired;
    uint256 idSlippage;
    int256[] deltaIds;
    uint256[] distributionX;
    uint256[] distributionY;
    address to;
    bytes hookData;
}
```

