# BinPool
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/pool-bin/libraries/BinPool.sol)

a library with all actions that can be performed on bin pool


## State Variables
### MINIMUM_SHARE
when a bin has supply for the first time, 1e3 share will be locked up
this is to prevent share inflation attack on BinPool type


```solidity
uint256 constant MINIMUM_SHARE = 1e3
```


## Functions
### initialize


```solidity
function initialize(State storage self, uint24 activeId, uint24 protocolFee, uint24 lpFee) internal;
```

### setProtocolFee


```solidity
function setProtocolFee(State storage self, uint24 protocolFee) internal;
```

### setLPFee

Only dynamic fee pools may update the swap fee.


```solidity
function setLPFee(State storage self, uint24 lpFee) internal;
```

### swap


```solidity
function swap(State storage self, SwapParams memory params)
    internal
    returns (BalanceDelta result, SwapState memory swapState);
```

### mint


```solidity
function mint(State storage self, MintParams memory params)
    internal
    returns (
        BalanceDelta result,
        bytes32 feeAmountToProtocol,
        MintArrays memory arrays,
        bytes32 compositionFeeAmount
    );
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`result`|`BalanceDelta`|the delta of the token balance of the pool (inclusive of fees)|
|`feeAmountToProtocol`|`bytes32`|total protocol fee amount|
|`arrays`|`MintArrays`|the ids, amounts and liquidity minted for each bin|
|`compositionFeeAmount`|`bytes32`|composition fee for adding different ratio to active bin|


### getBin

Returns the reserves of a bin


```solidity
function getBin(State storage self, uint16 binStep, uint24 id)
    internal
    view
    returns (uint128 binReserveX, uint128 binReserveY, uint256 binLiquidity, uint256 binShare);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`State`||
|`binStep`|`uint16`|The binStep of the bin|
|`id`|`uint24`|The id of the bin|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`binReserveX`|`uint128`|The reserve of token X in the bin|
|`binReserveY`|`uint128`|The reserve of token Y in the bin|
|`binLiquidity`|`uint256`|The liquidity in the bin|
|`binShare`|`uint256`|The shares in the bin|


### getNextNonEmptyBin

Returns next non-empty bin


```solidity
function getNextNonEmptyBin(State storage self, bool swapForY, uint24 id) internal view returns (uint24);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`State`||
|`swapForY`|`bool`|Whether the swap is for Y|
|`id`|`uint24`|The id of the bin|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint24`|The id of the next non-empty bin|


### burn

Burn user's share and withdraw tokens form the pool.


```solidity
function burn(State storage self, BurnParams memory params)
    internal
    returns (BalanceDelta result, uint256[] memory ids, bytes32[] memory amounts);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`result`|`BalanceDelta`|the delta of the token balance of the pool|
|`ids`|`uint256[]`||
|`amounts`|`bytes32[]`||


### donate


```solidity
function donate(State storage self, uint16 binStep, uint128 amount0, uint128 amount1)
    internal
    returns (BalanceDelta result, uint24 activeId);
```

### _mintBins

Helper function to mint liquidity in each bin in the liquidity configurations


```solidity
function _mintBins(State storage self, MintParams memory params, MintArrays memory arrays)
    private
    returns (bytes32 amountsLeft, bytes32 feeAmountToProtocol, bytes32 compositionFeeAmount);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`State`||
|`params`|`MintParams`|MintParams (to, liquidityConfig, amountIn, binStep and fee)|
|`arrays`|`MintArrays`|MintArrays (ids[] , amounts[], liquidityMinted[])|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amountsLeft`|`bytes32`|amountLeft after deducting all the input (inclusive of fee) from amountIn|
|`feeAmountToProtocol`|`bytes32`|total protocol fee for minting|
|`compositionFeeAmount`|`bytes32`|composition fee for adding different ratio to active bin|


### _updateBin

Helper function to update a bin during minting


```solidity
function _updateBin(State storage self, MintParams memory params, uint24 id, bytes32 maxAmountsInToBin)
    internal
    returns (
        uint256 shares,
        bytes32 amountsIn,
        bytes32 amountsInToBin,
        bytes32 feeAmountToProtocol,
        bytes32 compositionFeeAmount
    );
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`self`|`State`||
|`params`|`MintParams`||
|`id`|`uint24`|The id of the bin|
|`maxAmountsInToBin`|`bytes32`|The maximum amounts in to the bin|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`shares`|`uint256`|The amount of shares minted|
|`amountsIn`|`bytes32`|The amounts in|
|`amountsInToBin`|`bytes32`|The amounts in to the bin|
|`feeAmountToProtocol`|`bytes32`|The amounts of fee for protocol|
|`compositionFeeAmount`|`bytes32`|The total amount of composition fee|


### _subShare

Subtract share from user's position and update total share supply of bin


```solidity
function _subShare(State storage self, address owner, uint24 binId, bytes32 salt, uint256 shares) internal;
```

### _addShare

Add share to user's position and update total share supply of bin

if bin is empty, deduct MINIMUM_SHARE from shares


```solidity
function _addShare(State storage self, address owner, uint24 binId, bytes32 salt, uint256 shares)
    internal
    returns (uint256 userShareAdded);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`userShareAdded`|`uint256`|The amount of share added to user's position|


### _addBinIdToTree

Enable bin id for a pool


```solidity
function _addBinIdToTree(State storage self, uint24 binId) internal;
```

### _removeBinIdToTree

remove bin id for a pool


```solidity
function _removeBinIdToTree(State storage self, uint24 binId) internal;
```

### checkPoolInitialized


```solidity
function checkPoolInitialized(State storage self) internal view;
```

## Errors
### PoolNotInitialized

```solidity
error PoolNotInitialized();
```

### PoolAlreadyInitialized

```solidity
error PoolAlreadyInitialized();
```

### PoolInvalidParameter

```solidity
error PoolInvalidParameter();
```

### BinPool__EmptyLiquidityConfigs

```solidity
error BinPool__EmptyLiquidityConfigs();
```

### BinPool__ZeroShares

```solidity
error BinPool__ZeroShares(uint24 id);
```

### BinPool__InvalidBurnInput

```solidity
error BinPool__InvalidBurnInput();
```

### BinPool__BurnZeroAmount

```solidity
error BinPool__BurnZeroAmount(uint24 id);
```

### BinPool__ZeroAmountsOut

```solidity
error BinPool__ZeroAmountsOut(uint24 id);
```

### BinPool__OutOfLiquidity

```solidity
error BinPool__OutOfLiquidity();
```

### BinPool__NoLiquidityToReceiveFees

```solidity
error BinPool__NoLiquidityToReceiveFees();
```

### BinPool__InsufficientAmountUnSpecified
if swap exactIn, x for y, unspecifiedToken = token y. if swap x for exact out y, unspecified token is x


```solidity
error BinPool__InsufficientAmountUnSpecified();
```

### BinPool__MaxLiquidityPerBinExceeded

```solidity
error BinPool__MaxLiquidityPerBinExceeded();
```

## Structs
### State
The state of a pool


```solidity
struct State {
    BinSlot0 slot0;
    /// @notice binId ==> (reserve of token x and y in the bin)
    mapping(uint256 binId => bytes32 reserve) reserveOfBin;
    /// @notice binId ==> (total share minted)
    mapping(uint256 binId => uint256 share) shareOfBin;
    /// @notice (user, binId, salt) => shares of user in a binId
    mapping(bytes32 positionHash => BinPosition.Info info) positions;
    /// @dev todo: cannot nest a struct with mapping, error: recursive type is not allowed for public state variables.
    /// TreeMath.TreeUint24 _tree;
    /// the 3 attributes below come from TreeMath
    bytes32 level0;
    mapping(bytes32 => bytes32) level1;
    mapping(bytes32 => bytes32) level2;
}
```

### SwapParams

```solidity
struct SwapParams {
    bool swapForY;
    uint16 binStep;
    uint24 lpFeeOverride;
    int128 amountSpecified; // negative for exactInput, positive for exactOutput
}
```

### SwapState

```solidity
struct SwapState {
    // current activeId
    uint24 activeId;
    // the protocol fee for the swap (single direction)
    uint16 protocolFee;
    // the swapFee (the total percentage charged within a swap, including the protocol fee and the LP fee)
    uint24 swapFee;
    // how much protocol fee has been charged
    bytes32 feeAmountToProtocol;
}
```

### MintParams

```solidity
struct MintParams {
    address to; // nft minted to
    bytes32[] liquidityConfigs;
    bytes32 amountIn;
    uint16 binStep;
    uint24 lpFeeOverride;
    bytes32 salt;
}
```

### MintArrays

```solidity
struct MintArrays {
    uint256[] ids;
    bytes32[] amounts;
    uint256[] liquidityMinted;
}
```

### BurnParams

```solidity
struct BurnParams {
    address from;
    uint256[] ids;
    uint256[] amountsToBurn;
    bytes32 salt;
}
```

