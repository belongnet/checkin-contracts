# CLPositionInfoLibrary
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-cl/libraries/CLPositionInfoLibrary.sol)


## State Variables
### EMPTY_POSITION_INFO

```solidity
CLPositionInfo internal constant EMPTY_POSITION_INFO = CLPositionInfo.wrap(0)
```


### MASK_UPPER_200_BITS

```solidity
uint256 internal constant MASK_UPPER_200_BITS = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000000000
```


### MASK_8_BITS

```solidity
uint256 internal constant MASK_8_BITS = 0xFF
```


### MASK_24_BITS

```solidity
uint24 internal constant MASK_24_BITS = 0xFFFFFF
```


### SET_UNSUBSCRIBE

```solidity
uint256 internal constant SET_UNSUBSCRIBE = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00
```


### SET_SUBSCRIBE

```solidity
uint256 internal constant SET_SUBSCRIBE = 0x01
```


### TICK_LOWER_OFFSET

```solidity
uint8 internal constant TICK_LOWER_OFFSET = 8
```


### TICK_UPPER_OFFSET

```solidity
uint8 internal constant TICK_UPPER_OFFSET = 32
```


## Functions
### poolId

This poolId is NOT compatible with the poolId used in infinity core. It is truncated to 25 bytes, and just used to lookup PoolKey in the poolKeys mapping.


```solidity
function poolId(CLPositionInfo info) internal pure returns (bytes25 _poolId);
```

### tickLower


```solidity
function tickLower(CLPositionInfo info) internal pure returns (int24 _tickLower);
```

### tickUpper


```solidity
function tickUpper(CLPositionInfo info) internal pure returns (int24 _tickUpper);
```

### hasSubscriber


```solidity
function hasSubscriber(CLPositionInfo info) internal pure returns (bool _hasSubscriber);
```

### setSubscribe

this does not actually set any storage


```solidity
function setSubscribe(CLPositionInfo info) internal pure returns (CLPositionInfo _info);
```

### setUnsubscribe

this does not actually set any storage


```solidity
function setUnsubscribe(CLPositionInfo info) internal pure returns (CLPositionInfo _info);
```

### initialize

Creates the default PositionInfo struct

Called when minting a new position


```solidity
function initialize(PoolKey memory _poolKey, int24 _tickLower, int24 _tickUpper)
    internal
    pure
    returns (CLPositionInfo info);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_poolKey`|`PoolKey`|the pool key of the position|
|`_tickLower`|`int24`|the lower tick of the position|
|`_tickUpper`|`int24`|the upper tick of the position|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`info`|`CLPositionInfo`|packed position info, with the truncated poolId and the hasSubscriber flag set to false|


