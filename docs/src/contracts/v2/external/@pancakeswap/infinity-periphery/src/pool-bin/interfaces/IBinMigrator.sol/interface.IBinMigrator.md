# IBinMigrator
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-bin/interfaces/IBinMigrator.sol)

**Inherits:**
[IBaseMigrator](/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/IBaseMigrator.sol/interface.IBaseMigrator.md)


## Functions
### migrateFromV2

Migrate liquidity from v2 to infinity


```solidity
function migrateFromV2(
    V2PoolParams calldata v2PoolParams,
    InfiBinPoolParams calldata infiPoolParams,
    // extra funds to be added
    uint256 extraAmount0,
    uint256 extraAmount1
) external payable;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`v2PoolParams`|`V2PoolParams`|ncessary info for removing liqudity the source v2 pool|
|`infiPoolParams`|`InfiBinPoolParams`|necessary info for adding liquidity the target infinity bin-pool|
|`extraAmount0`|`uint256`|the extra amount of token0 that user wants to add (optional, usually 0) if pool token0 is ETH and msg.value == 0, WETH will be taken from sender. Otherwise if pool token0 is ETH and msg.value !=0, method will assume user have sent extraAmount0 in msg.value|
|`extraAmount1`|`uint256`|the extra amount of token1 that user wants to add (optional, usually 0)|


### migrateFromV3

Migrate liquidity from v3 to infinity


```solidity
function migrateFromV3(
    V3PoolParams calldata v3PoolParams,
    InfiBinPoolParams calldata infiPoolParams,
    // extra funds to be added
    uint256 extraAmount0,
    uint256 extraAmount1
) external payable;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`v3PoolParams`|`V3PoolParams`|ncessary info for removing liqudity the source v3 pool|
|`infiPoolParams`|`InfiBinPoolParams`|necessary info for adding liquidity the target infinity bin-pool|
|`extraAmount0`|`uint256`|the extra amount of token0 that user wants to add (optional, usually 0) if pool token0 is ETH and msg.value == 0, WETH will be taken from sender. Otherwise if pool token0 is ETH and msg.value !=0, method will assume user have sent extraAmount0 in msg.value|
|`extraAmount1`|`uint256`|the extra amount of token1 that user wants to add (optional, usually 0)|


### initializePool

Initialize a pool for a given pool key, the function will forwards the call to the BinPoolManager

Call this when the pool does not exist and is not initialized


```solidity
function initializePool(PoolKey memory poolKey, uint24 activeId) external payable;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`poolKey`|`PoolKey`|The pool key|
|`activeId`|`uint24`|The active id of the pool|


## Structs
### InfiBinPoolParams
same fields as IBinRouterBase.BinAddLiquidityParams
except amount0/amount1 which will be calculated by migrator


```solidity
struct InfiBinPoolParams {
    PoolKey poolKey;
    uint128 amount0Max;
    uint128 amount1Max;
    uint256 activeIdDesired;
    uint256 idSlippage;
    int256[] deltaIds;
    uint256[] distributionX;
    uint256[] distributionY;
    address to;
    uint256 deadline;
    // hookData will flow to hook's beforeMint/ afterMint
    bytes hookData;
}
```

