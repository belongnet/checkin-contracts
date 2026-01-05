# IBinHooks
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-bin/interfaces/IBinHooks.sol)

**Inherits:**
[IHooks](/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IHooks.sol/interface.IHooks.md)

The PoolManager contract decides whether to invoke specific hook by inspecting the first 16
bits of bytes32 PoolKey.parameters. For example a 1 bit in the first bit will cause the beforeInitialize
hook to be invoked.

Should only be callable by the PoolManager.


## Functions
### beforeInitialize

The hook called before the state of a pool is initialized


```solidity
function beforeInitialize(address sender, PoolKey calldata key, uint24 activeId) external returns (bytes4);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the initialize call|
|`key`|`PoolKey`|The key for the pool being initialized|
|`activeId`|`uint24`|The binId of the pool, when the value is 2 ** 23, token price is 1:1|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|


### afterInitialize

The hook called after the state of a pool is initialized


```solidity
function afterInitialize(address sender, PoolKey calldata key, uint24 activeId) external returns (bytes4);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the initialize call|
|`key`|`PoolKey`|The key for the pool being initialized|
|`activeId`|`uint24`|The binId of the pool, when the value is 2 ** 23, token price is 1:1|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|


### beforeMint

The hook called before adding liquidity


```solidity
function beforeMint(
    address sender,
    PoolKey calldata key,
    IBinPoolManager.MintParams calldata params,
    bytes calldata hookData
) external returns (bytes4, uint24);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the modify position call|
|`key`|`PoolKey`|The key for the pool|
|`params`|`IBinPoolManager.MintParams`|The parameters for adding liquidity|
|`hookData`|`bytes`|Arbitrary data handed into the PoolManager by the liquidty provider to be be passed on to the hook|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|
|`<none>`|`uint24`|uint24 Optionally override the lp fee, only used if four conditions are met: 1) Liquidity added to active bin in different ratio from current bin (causing an internal swap) 2) the Pool has a dynamic fee, 3) the value's override flag is set to 1 i.e. vaule & OVERRIDE_FEE_FLAG = 0x400000 != 0 4) the value is less than or equal to the maximum fee (100_000) - 10%|


### afterMint

The hook called after adding liquidity


```solidity
function afterMint(
    address sender,
    PoolKey calldata key,
    IBinPoolManager.MintParams calldata params,
    BalanceDelta delta,
    bytes calldata hookData
) external returns (bytes4, BalanceDelta);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the modify position call|
|`key`|`PoolKey`|The key for the pool|
|`params`|`IBinPoolManager.MintParams`|The parameters for adding liquidity|
|`delta`|`BalanceDelta`|The amount owed to the locker (positive) or owed to the pool (negative)|
|`hookData`|`bytes`|Arbitrary data handed into the PoolManager by the liquidty provider to be be passed on to the hook|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|
|`<none>`|`BalanceDelta`|BalanceDelta The hook's delta in token0 and token1.|


### beforeBurn

The hook called before removing liquidity


```solidity
function beforeBurn(
    address sender,
    PoolKey calldata key,
    IBinPoolManager.BurnParams calldata params,
    bytes calldata hookData
) external returns (bytes4);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the modify position call|
|`key`|`PoolKey`|The key for the pool|
|`params`|`IBinPoolManager.BurnParams`|The parameters for removing liquidity|
|`hookData`|`bytes`|Arbitrary data handed into the PoolManager by the liquidty provider to be be passed on to the hook|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|


### afterBurn

The hook called after removing liquidity


```solidity
function afterBurn(
    address sender,
    PoolKey calldata key,
    IBinPoolManager.BurnParams calldata params,
    BalanceDelta delta,
    bytes calldata hookData
) external returns (bytes4, BalanceDelta);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the modify position call|
|`key`|`PoolKey`|The key for the pool|
|`params`|`IBinPoolManager.BurnParams`|The parameters for removing liquidity|
|`delta`|`BalanceDelta`|The amount owed to the locker (positive) or owed to the pool (negative)|
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
    bool swapForY,
    int128 amountSpecified,
    bytes calldata hookData
) external returns (bytes4, BeforeSwapDelta, uint24);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the swap call|
|`key`|`PoolKey`|The key for the pool|
|`swapForY`|`bool`|If true, indicate swap X for Y or if false, swap Y for X|
|`amountSpecified`|`int128`|Amount of tokenX or tokenY, negative imply exactInput, positive imply exactOutput|
|`hookData`|`bytes`|Arbitrary data handed into the PoolManager by the swapper to be be passed on to the hook|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes4`|bytes4 The function selector for the hook|
|`<none>`|`BeforeSwapDelta`|BeforeSwapDelta The hook's delta in specified and unspecified currencies.|
|`<none>`|`uint24`|uint24 Optionally override the lp fee, only used if three conditions are met: 1) the Pool has a dynamic fee, 2) the value's override flag is set to 1 i.e. vaule & OVERRIDE_FEE_FLAG = 0x400000 != 0 3) the value is less than or equal to the maximum fee (100_000) - 10%|


### afterSwap

The hook called after a swap


```solidity
function afterSwap(
    address sender,
    PoolKey calldata key,
    bool swapForY,
    int128 amountSpecified,
    BalanceDelta delta,
    bytes calldata hookData
) external returns (bytes4, int128);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The initial msg.sender for the swap call|
|`key`|`PoolKey`|The key for the pool|
|`swapForY`|`bool`|If true, indicate swap X for Y or if false, swap Y for X|
|`amountSpecified`|`int128`|Amount of tokenX or tokenY, negative imply exactInput, positive imply exactOutput|
|`delta`|`BalanceDelta`|The amount owed to the locker or owed to the pool|
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


