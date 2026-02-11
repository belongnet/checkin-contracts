# ICLPositionManager
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-cl/interfaces/ICLPositionManager.sol)

**Inherits:**
[IPositionManager](/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/IPositionManager.sol/interface.IPositionManager.md)


## Functions
### clPoolManager

Get the clPoolManager


```solidity
function clPoolManager() external view returns (ICLPoolManager);
```

### initializePool

Initialize an infinity cl pool

If the pool is already initialized, this function will not revert and just return type(int24).max


```solidity
function initializePool(PoolKey calldata key, uint160 sqrtPriceX96) external payable returns (int24);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`key`|`PoolKey`|the PoolKey of the pool to initialize|
|`sqrtPriceX96`|`uint160`|the initial sqrtPriceX96 of the pool|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`int24`|tick The current tick of the pool|


### nextTokenId

Used to get the ID that will be used for the next minted liquidity position


```solidity
function nextTokenId() external view returns (uint256);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|uint256 The next token ID|


### getPositionLiquidity

this value can be processed as an amount0 and amount1 by using the LiquidityAmounts library


```solidity
function getPositionLiquidity(uint256 tokenId) external view returns (uint128 liquidity);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tokenId`|`uint256`|the ERC721 tokenId|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`liquidity`|`uint128`|the position's liquidity, as a liquidityAmount|


### positions

Get the detailed information for a specified position


```solidity
function positions(uint256 tokenId)
    external
    view
    returns (
        PoolKey memory poolKey,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity,
        uint256 feeGrowthInside0LastX128,
        uint256 feeGrowthInside1LastX128,
        ICLSubscriber _subscriber
    );
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tokenId`|`uint256`|the ERC721 tokenId|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`poolKey`|`PoolKey`|the pool key of the position|
|`tickLower`|`int24`|the lower tick of the position|
|`tickUpper`|`int24`|the upper tick of the position|
|`liquidity`|`uint128`|the liquidity of the position|
|`feeGrowthInside0LastX128`|`uint256`|the fee growth count of token0 since last time updated|
|`feeGrowthInside1LastX128`|`uint256`|the fee growth count of token1 since last time updated|
|`_subscriber`|`ICLSubscriber`|the address of the subscriber, if not set, it returns address(0)|


### getPoolAndPositionInfo


```solidity
function getPoolAndPositionInfo(uint256 tokenId) external view returns (PoolKey memory, CLPositionInfo);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tokenId`|`uint256`|the ERC721 tokenId|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`PoolKey`|poolKey the pool key of the position|
|`<none>`|`CLPositionInfo`|CLPositionInfo a uint256 packed value holding information about the position including the range (tickLower, tickUpper)|


## Events
### MintPosition
Emitted when a new liquidity position is minted


```solidity
event MintPosition(uint256 indexed tokenId);
```

### ModifyLiquidity
Emitted when liquidity is modified


```solidity
event ModifyLiquidity(uint256 indexed tokenId, int256 liquidityChange, BalanceDelta feesAccrued);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tokenId`|`uint256`|the tokenId of the position that was modified|
|`liquidityChange`|`int256`|the change in liquidity of the position|
|`feesAccrued`|`BalanceDelta`|the fees collected from the liquidity change|

## Errors
### NotApproved
Thrown when the caller is not approved to modify a position


```solidity
error NotApproved(address caller);
```

