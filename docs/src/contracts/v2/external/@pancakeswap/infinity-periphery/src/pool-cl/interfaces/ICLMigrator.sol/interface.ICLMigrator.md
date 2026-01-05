# ICLMigrator
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-cl/interfaces/ICLMigrator.sol)

**Inherits:**
[IBaseMigrator](/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/IBaseMigrator.sol/interface.IBaseMigrator.md)


## Functions
### migrateFromV2

Migrate liquidity from v2 to infinity


```solidity
function migrateFromV2(
    V2PoolParams calldata v2PoolParams,
    InfiCLPoolParams calldata infiPoolParams,
    // extra funds to be added
    uint256 extraAmount0,
    uint256 extraAmount1
) external payable;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`v2PoolParams`|`V2PoolParams`|ncessary info for removing liqudity the source v2 pool|
|`infiPoolParams`|`InfiCLPoolParams`|necessary info for adding liquidity the target infinity cl-pool|
|`extraAmount0`|`uint256`|the extra amount of token0 that user wants to add (optional, usually 0) if pool token0 is ETH and msg.value == 0, WETH will be taken from sender. Otherwise if pool token0 is ETH and msg.value !=0, method will assume user have sent extraAmount0 in msg.value|
|`extraAmount1`|`uint256`|the extra amount of token1 that user wants to add (optional, usually 0)|


### migrateFromV3

Migrate liquidity from v3 to infinity


```solidity
function migrateFromV3(
    V3PoolParams calldata v3PoolParams,
    InfiCLPoolParams calldata infiPoolParams,
    // extra funds to be added
    uint256 extraAmount0,
    uint256 extraAmount1
) external payable;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`v3PoolParams`|`V3PoolParams`|ncessary info for removing liqudity the source v3 pool|
|`infiPoolParams`|`InfiCLPoolParams`|necessary info for adding liquidity the target infinity cl-pool|
|`extraAmount0`|`uint256`|the extra amount of token0 that user wants to add (optional, usually 0) if pool token0 is ETH and msg.value == 0, WETH will be taken from sender. Otherwise if pool token0 is ETH and msg.value !=0, method will assume user have sent extraAmount0 in msg.value|
|`extraAmount1`|`uint256`|the extra amount of token1 that user wants to add (optional, usually 0)|


### initializePool

Initialize a pool for a given pool key, the function will forwards the call to the CLPoolManager

Call this when the pool does not exist and is not initialized.


```solidity
function initializePool(PoolKey memory poolKey, uint160 sqrtPriceX96) external payable returns (int24 tick);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`poolKey`|`PoolKey`|The pool key|
|`sqrtPriceX96`|`uint160`|The initial sqrt price of the pool|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`tick`|`int24`|Pool tick|


## Errors
### INSUFFICIENT_LIQUIDITY

```solidity
error INSUFFICIENT_LIQUIDITY();
```

## Structs
### InfiCLPoolParams
same fields as INonfungiblePositionManager.MintParams
except amount0Desired/amount1Desired which will be calculated by migrator


```solidity
struct InfiCLPoolParams {
    PoolKey poolKey;
    int24 tickLower;
    int24 tickUpper;
    uint256 liquidityMin;
    address recipient;
    uint256 deadline;
    // hookData will flow to hook's beforeAddLiquidity/ afterAddLiquidity
    bytes hookData;
}
```

### MintParams

```solidity
struct MintParams {
    PoolKey poolKey;
    int24 tickLower;
    int24 tickUpper;
    uint128 amount0In;
    uint128 amount1In;
    uint256 liquidityMin;
    address recipient;
    bytes hookData;
}
```

