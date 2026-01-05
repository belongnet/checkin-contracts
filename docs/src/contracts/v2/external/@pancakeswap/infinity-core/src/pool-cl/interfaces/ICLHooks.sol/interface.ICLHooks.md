# ICLHooks
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-cl/interfaces/ICLHooks.sol)

**Inherits:**
[IHooks](/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IHooks.sol/interface.IHooks.md)

The PoolManager contract decides whether to invoke specific hooks by inspecting the leading bits
of the hooks contract address. For example, a 1 bit in the first bit of the address will
cause the 'before swap' hook to be invoked. See the Hooks library for the full spec.

Should only be callable by PoolManager.


## Functions
### beforeInitialize

The hook called before the state of a pool is initialized


```solidity
function beforeInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96) external returns (bytes4);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the initialize call|
|`key`|`PoolKey`|The key for the pool being initialized|
|`sqrtPriceX96`|`uint160`|The sqrt(price) of the pool as a Q64.96|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|


### afterInitialize

The hook called after the state of a pool is initialized


```solidity
function afterInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96, int24 tick)
    external
    returns (bytes4);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the initialize call|
|`key`|`PoolKey`|The key for the pool being initialized|
|`sqrtPriceX96`|`uint160`|The sqrt(price) of the pool as a Q64.96|
|`tick`|`int24`|The current tick after the state of a pool is initialized|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|


### beforeAddLiquidity

The hook called before liquidity is added


```solidity
function beforeAddLiquidity(
    address sender,
    PoolKey calldata key,
    ICLPoolManager.ModifyLiquidityParams calldata params,
    bytes calldata hookData
) external returns (bytes4);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the add liquidity call|
|`key`|`PoolKey`|The key for the pool|
|`params`|`ICLPoolManager.ModifyLiquidityParams`|The parameters for adding liquidity|
|`hookData`|`bytes`|Arbitrary data handed into the PoolManager by the liquidty provider to be be passed on to the hook|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|


### afterAddLiquidity

The hook called after liquidity is added


```solidity
function afterAddLiquidity(
    address sender,
    PoolKey calldata key,
    ICLPoolManager.ModifyLiquidityParams calldata params,
    BalanceDelta delta,
    BalanceDelta feesAccrued,
    bytes calldata hookData
) external returns (bytes4, BalanceDelta);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the add liquidity call|
|`key`|`PoolKey`|The key for the pool|
|`params`|`ICLPoolManager.ModifyLiquidityParams`|The parameters for adding liquidity|
|`delta`|`BalanceDelta`|The caller's balance delta after adding liquidity; the sum of principal delta, fees accrued, and hook delta|
|`feesAccrued`|`BalanceDelta`|The fees accrued since the last time fees were collected from this position|
|`hookData`|`bytes`|Arbitrary data handed into the PoolManager by the liquidty provider to be be passed on to the hook|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|
|`<none>`|`BalanceDelta`|BalanceDelta The hook's delta in token0 and token1.|


### beforeRemoveLiquidity

The hook called before liquidity is removed


```solidity
function beforeRemoveLiquidity(
    address sender,
    PoolKey calldata key,
    ICLPoolManager.ModifyLiquidityParams calldata params,
    bytes calldata hookData
) external returns (bytes4);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the remove liquidity call|
|`key`|`PoolKey`|The key for the pool|
|`params`|`ICLPoolManager.ModifyLiquidityParams`|The parameters for removing liquidity|
|`hookData`|`bytes`|Arbitrary data handed into the PoolManager by the liquidty provider to be be passed on to the hook|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|


### afterRemoveLiquidity

The hook called after liquidity is removed


```solidity
function afterRemoveLiquidity(
    address sender,
    PoolKey calldata key,
    ICLPoolManager.ModifyLiquidityParams calldata params,
    BalanceDelta delta,
    BalanceDelta feesAccrued,
    bytes calldata hookData
) external returns (bytes4, BalanceDelta);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the remove liquidity call|
|`key`|`PoolKey`|The key for the pool|
|`params`|`ICLPoolManager.ModifyLiquidityParams`|The parameters for removing liquidity|
|`delta`|`BalanceDelta`|The caller's balance delta after removing liquidity; the sum of principal delta, fees accrued, and hook delta|
|`feesAccrued`|`BalanceDelta`|The fees accrued since the last time fees were collected from this position|
|`hookData`|`bytes`|Arbitrary data handed into the PoolManager by the liquidty provider to be be passed on to the hook|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|
|`<none>`|`BalanceDelta`|BalanceDelta The hook's delta in token0 and token1.|


### beforeSwap

The hook called before a swap


```solidity
function beforeSwap(
    address sender,
    PoolKey calldata key,
    ICLPoolManager.SwapParams calldata params,
    bytes calldata hookData
) external returns (bytes4, BeforeSwapDelta, uint24);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the swap call|
|`key`|`PoolKey`|The key for the pool|
|`params`|`ICLPoolManager.SwapParams`|The parameters for the swap|
|`hookData`|`bytes`|Arbitrary data handed into the PoolManager by the swapper to be be passed on to the hook|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|
|`<none>`|`BeforeSwapDelta`|BeforeSwapDelta The hook's delta in specified and unspecified currencies.|
|`<none>`|`uint24`|uint24 Optionally override the lp fee, only used if three conditions are met: 1) the Pool has a dynamic fee, 2) the value's override flag is set to 1 i.e. vaule & OVERRIDE_FEE_FLAG = 0x400000 != 0 3) the value is less than or equal to the maximum fee (1 million)|


### afterSwap

The hook called after a swap


```solidity
function afterSwap(
    address sender,
    PoolKey calldata key,
    ICLPoolManager.SwapParams calldata params,
    BalanceDelta delta,
    bytes calldata hookData
) external returns (bytes4, int128);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the swap call|
|`key`|`PoolKey`|The key for the pool|
|`params`|`ICLPoolManager.SwapParams`|The parameters for the swap|
|`delta`|`BalanceDelta`|The amount owed to the locker (positive) or owed to the pool (negative)|
|`hookData`|`bytes`|Arbitrary data handed into the PoolManager by the swapper to be be passed on to the hook|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|
|`<none>`|`int128`|int128 The hook's delta in unspecified currency|


### beforeDonate

The hook called before donate


```solidity
function beforeDonate(
    address sender,
    PoolKey calldata key,
    uint256 amount0,
    uint256 amount1,
    bytes calldata hookData
) external returns (bytes4);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the donate call|
|`key`|`PoolKey`|The key for the pool|
|`amount0`|`uint256`|The amount of token0 being donated|
|`amount1`|`uint256`|The amount of token1 being donated|
|`hookData`|`bytes`|Arbitrary data handed into the PoolManager by the donor to be be passed on to the hook|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|


### afterDonate

The hook called after donate


```solidity
function afterDonate(
    address sender,
    PoolKey calldata key,
    uint256 amount0,
    uint256 amount1,
    bytes calldata hookData
) external returns (bytes4);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the donate call|
|`key`|`PoolKey`|The key for the pool|
|`amount0`|`uint256`|The amount of token0 being donated|
|`amount1`|`uint256`|The amount of token1 being donated|
|`hookData`|`bytes`|Arbitrary data handed into the PoolManager by the donor to be be passed on to the hook|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|


