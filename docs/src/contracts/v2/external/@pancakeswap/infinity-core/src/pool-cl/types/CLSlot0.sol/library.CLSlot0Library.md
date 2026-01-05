# CLSlot0Library
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/pool-cl/types/CLSlot0.sol)

Library for getting and setting values in the Slot0 type


## State Variables
### MASK_160_BITS

```solidity
uint160 internal constant MASK_160_BITS = 0x00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
```


### MASK_24_BITS

```solidity
uint24 internal constant MASK_24_BITS = 0xFFFFFF
```


### TICK_OFFSET

```solidity
uint8 internal constant TICK_OFFSET = 160
```


### PROTOCOL_FEE_OFFSET

```solidity
uint8 internal constant PROTOCOL_FEE_OFFSET = 184
```


### LP_FEE_OFFSET

```solidity
uint8 internal constant LP_FEE_OFFSET = 208
```


## Functions
### sqrtPriceX96


```solidity
function sqrtPriceX96(CLSlot0 _packed) internal pure returns (uint160 _sqrtPriceX96);
```

### tick


```solidity
function tick(CLSlot0 _packed) internal pure returns (int24 _tick);
```

### protocolFee


```solidity
function protocolFee(CLSlot0 _packed) internal pure returns (uint24 _protocolFee);
```

### lpFee


```solidity
function lpFee(CLSlot0 _packed) internal pure returns (uint24 _lpFee);
```

### setSqrtPriceX96


```solidity
function setSqrtPriceX96(CLSlot0 _packed, uint160 _sqrtPriceX96) internal pure returns (CLSlot0 _result);
```

### setTick


```solidity
function setTick(CLSlot0 _packed, int24 _tick) internal pure returns (CLSlot0 _result);
```

### setProtocolFee


```solidity
function setProtocolFee(CLSlot0 _packed, uint24 _protocolFee) internal pure returns (CLSlot0 _result);
```

### setLpFee


```solidity
function setLpFee(CLSlot0 _packed, uint24 _lpFee) internal pure returns (CLSlot0 _result);
```

