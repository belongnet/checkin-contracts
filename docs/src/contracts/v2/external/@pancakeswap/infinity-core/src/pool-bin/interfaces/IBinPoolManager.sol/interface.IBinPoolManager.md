# IBinPoolManager
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-bin/interfaces/IBinPoolManager.sol)

**Inherits:**
[IProtocolFees](/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IProtocolFees.sol/interface.IProtocolFees.md), [IPoolManager](/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IPoolManager.sol/interface.IPoolManager.md), [IExtsload](/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IExtsload.sol/interface.IExtsload.md)


## Functions
### maxBinStep

Returns the constant representing the max bin step


```solidity
function maxBinStep() external view returns (uint16);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint16`|maxBinStep a value of 100 would represent a 1% price jump between bin (limit can be raised by owner)|


### MIN_BIN_STEP

Returns the constant representing the min bin step

1 would represent a 0.01% price jump between bin


```solidity
function MIN_BIN_STEP() external view returns (uint16);
```

### minBinShareForDonate

min share in bin before donate is allowed in current bin


```solidity
function minBinShareForDonate() external view returns (uint256);
```

### getSlot0

Get the current value in slot0 of the given pool


```solidity
function getSlot0(PoolId id) external view returns (uint24 activeId, uint24 protocolFee, uint24 lpFee);
```

### getBin

Returns the reserves of a bin


```solidity
function getBin(PoolId id, uint24 binId)
    external
    view
    returns (uint128 binReserveX, uint128 binReserveY, uint256 binLiquidity, uint256 totalShares);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`PoolId`|The id of the bin|
|`binId`|`uint24`||

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`binReserveX`|`uint128`|The reserve of token X in the bin|
|`binReserveY`|`uint128`|The reserve of token Y in the bin|
|`binLiquidity`|`uint256`|The total liquidity in the bin|
|`totalShares`|`uint256`|The total shares minted in the bin|


### getPosition

Returns the positon of owner at a binId


```solidity
function getPosition(PoolId id, address owner, uint24 binId, bytes32 salt)
    external
    view
    returns (BinPosition.Info memory position);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`PoolId`|The id of PoolKey|
|`owner`|`address`|Address of the owner|
|`binId`|`uint24`|The id of the bin|
|`salt`|`bytes32`|The salt to distinguish different positions for the same owner|


### getNextNonEmptyBin

Returns the next non-empty bin

The next non-empty bin is the bin with a higher (if swapForY is true) or lower (if swapForY is false)
id that has a non-zero reserve of token X or Y.


```solidity
function getNextNonEmptyBin(PoolId id, bool swapForY, uint24 binId) external view returns (uint24 nextId);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`PoolId`|The id of the bin|
|`swapForY`|`bool`|Whether the swap is for token Y (true) or token X (false)|
|`binId`|`uint24`||

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`nextId`|`uint24`|The id of the next non-empty bin|


### initialize

Initialize a new pool


```solidity
function initialize(PoolKey memory key, uint24 activeId) external;
```

### mint

Add liquidity to a pool

For the first liquidity added to a bin, the share minted would be slightly lessser (1e3 lesser) to prevent
share inflation attack.


```solidity
function mint(PoolKey memory key, IBinPoolManager.MintParams calldata params, bytes calldata hookData)
    external
    returns (BalanceDelta delta, BinPool.MintArrays memory mintArray);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`delta`|`BalanceDelta`|BalanceDelta, will be negative indicating how much total amt0 and amt1 liquidity added|
|`mintArray`|`BinPool.MintArrays`|Liquidity added in which ids, how much amt0, amt1 and how much liquidity added|


### burn

Remove liquidity from a pool


```solidity
function burn(PoolKey memory key, IBinPoolManager.BurnParams memory params, bytes calldata hookData)
    external
    returns (BalanceDelta delta);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`delta`|`BalanceDelta`|BalanceDelta, will be positive indicating how much total amt0 and amt1 liquidity removed|


### swap

Peform a swap to a pool


```solidity
function swap(PoolKey memory key, bool swapForY, int128 amountSpecified, bytes calldata hookData)
    external
    returns (BalanceDelta delta);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`key`|`PoolKey`|The pool key|
|`swapForY`|`bool`|If true, swap token X for Y, if false, swap token Y for X|
|`amountSpecified`|`int128`|If negative, imply exactInput, if positive, imply exactOutput.|
|`hookData`|`bytes`||


### donate

Donate the given currency amounts to the active bin liquidity providers of a pool

Calls to donate can be frontrun adding just-in-time liquidity, with the aim of receiving a portion donated funds.
Donors should keep this in mind when designing donation mechanisms.


```solidity
function donate(PoolKey memory key, uint128 amount0, uint128 amount1, bytes calldata hookData)
    external
    returns (BalanceDelta delta, uint24 binId);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`key`|`PoolKey`|The pool to donate to|
|`amount0`|`uint128`|The amount of currency0 to donate|
|`amount1`|`uint128`|The amount of currency1 to donate|
|`hookData`|`bytes`|Any data to pass to the callback|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`delta`|`BalanceDelta`|Negative amt means the caller owes the vault, while positive amt means the vault owes the caller|
|`binId`|`uint24`|The donated bin id, which is the current active bin id. if no-op happen, binId will be 0|


### setMaxBinStep

Set max bin step for BinPool

To be realistic, its highly unlikely a pool type with > 100 bin step is required. (>1% price jump per bin)


```solidity
function setMaxBinStep(uint16 maxBinStep) external;
```

### setMinBinSharesForDonate

Set min shares in bin before donate is allowed in current bin

Bin share is 1:1 liquidity when liquidity is first added. And liquidity: price * x + y << 128, where price is a 128.128 number. A
min share amount required in the bin for donate prevents share inflation attack.
Min share should always be greater than 0, there should be a validation on BinPoolManagerOwner to prevent setting min share to 0


```solidity
function setMinBinSharesForDonate(uint256 minShare) external;
```

## Events
### Initialize
Emitted when a new pool is initialized


```solidity
event Initialize(
    PoolId indexed id,
    Currency indexed currency0,
    Currency indexed currency1,
    IHooks hooks,
    uint24 fee,
    bytes32 parameters,
    uint24 activeId
);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`PoolId`|The abi encoded hash of the pool key struct for the new pool|
|`currency0`|`Currency`|The first currency of the pool by address sort order|
|`currency1`|`Currency`|The second currency of the pool by address sort order|
|`hooks`|`IHooks`|The hooks contract address for the pool, or address(0) if none|
|`fee`|`uint24`|The lp fee collected upon every swap in the pool, denominated in hundredths of a bip|
|`parameters`|`bytes32`|Includes hooks callback bitmap and binStep|
|`activeId`|`uint24`|The id of active bin on initialization|

### Swap
Emitted for swaps between currency0 and currency1


```solidity
event Swap(
    PoolId indexed id,
    address indexed sender,
    int128 amount0,
    int128 amount1,
    uint24 activeId,
    uint24 fee,
    uint16 protocolFee
);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`PoolId`|The abi encoded hash of the pool key struct for the pool that was modified|
|`sender`|`address`|The address that initiated the swap call, and that received the callback|
|`amount0`|`int128`|The delta of the currency0 balance of the pool|
|`amount1`|`int128`|The delta of the currency1 balance of the pool|
|`activeId`|`uint24`|The activeId of the pool after the swap|
|`fee`|`uint24`|The fee collected upon every swap in the pool (including protocol fee and LP fee), denominated in hundredths of a bip|
|`protocolFee`|`uint16`|Single direction protocol fee from the swap, also denominated in hundredths of a bip|

### Mint
Emitted when liquidity is added


```solidity
event Mint(
    PoolId indexed id,
    address indexed sender,
    uint256[] ids,
    bytes32 salt,
    bytes32[] amounts,
    bytes32 compositionFeeAmount,
    bytes32 feeAmountToProtocol
);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`PoolId`|The abi encoded hash of the pool key struct for the pool that was modified|
|`sender`|`address`|The address that modified the pool|
|`ids`|`uint256[]`|List of binId with liquidity added|
|`salt`|`bytes32`|The salt to distinguish different mint from the same owner|
|`amounts`|`bytes32[]`|List of amount added to each bin|
|`compositionFeeAmount`|`bytes32`|fee occurred|
|`feeAmountToProtocol`|`bytes32`|Protocol fee from the swap: token0 and token1 amount|

### Burn
Emitted when liquidity is removed


```solidity
event Burn(PoolId indexed id, address indexed sender, uint256[] ids, bytes32 salt, bytes32[] amounts);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`PoolId`|The abi encoded hash of the pool key struct for the pool that was modified|
|`sender`|`address`|The address that modified the pool|
|`ids`|`uint256[]`|List of binId with liquidity removed|
|`salt`|`bytes32`|The salt to specify the position to burn if multiple positions are available|
|`amounts`|`bytes32[]`|List of amount removed from each bin|

### Donate
Emitted when donate happen


```solidity
event Donate(PoolId indexed id, address indexed sender, int128 amount0, int128 amount1, uint24 binId);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`PoolId`|The abi encoded hash of the pool key struct for the pool that was modified|
|`sender`|`address`|The address that modified the pool|
|`amount0`|`int128`|The delta of the currency0 balance of the pool|
|`amount1`|`int128`|The delta of the currency1 balance of the pool|
|`binId`|`uint24`|The donated bin id|

### SetMinBinSharesForDonate
Emitted when min share for donate is updated


```solidity
event SetMinBinSharesForDonate(uint256 minLiquidity);
```

### SetMaxBinStep
Emitted when bin step is updated


```solidity
event SetMaxBinStep(uint16 maxBinStep);
```

## Errors
### PoolManagerMismatch
PoolManagerMismatch is thrown when pool manager specified in the pool key does not match current contract


```solidity
error PoolManagerMismatch();
```

### BinStepTooSmall
Pool binStep cannot be lesser than 1. Otherwise there will be no price jump between bin


```solidity
error BinStepTooSmall(uint16 binStep);
```

### BinStepTooLarge
Pool binstep cannot be greater than the limit set at maxBinStep


```solidity
error BinStepTooLarge(uint16 binStep);
```

### MaxBinStepTooSmall
Error thrown when owner set max bin step too small


```solidity
error MaxBinStepTooSmall(uint16 maxBinStep);
```

### InsufficientBinShareForDonate
Error thrown when bin has insufficient shares to accept donation


```solidity
error InsufficientBinShareForDonate(uint256 shares);
```

### AmountSpecifiedIsZero
Error thrown when amount specified is 0 in swap


```solidity
error AmountSpecifiedIsZero();
```

## Structs
### MintParams

```solidity
struct MintParams {
    bytes32[] liquidityConfigs;
    /// @dev amountIn intended
    bytes32 amountIn;
    /// the salt to distinguish different mint from the same owner
    bytes32 salt;
}
```

### BurnParams

```solidity
struct BurnParams {
    /// @notice id of the bin from which to withdraw
    uint256[] ids;
    /// @notice amount of share to burn for each bin
    uint256[] amountsToBurn;
    /// the salt to specify the position to burn if multiple positions are available
    bytes32 salt;
}
```

