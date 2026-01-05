# BinSlot0Library
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/pool-bin/types/BinSlot0.sol)

Library for getting and setting values in the Slot0 type


## State Variables
### MASK_24_BITS

```solidity
uint24 internal constant MASK_24_BITS = 0xFFFFFF
```


### PROTOCOL_FEE_OFFSET

```solidity
uint8 internal constant PROTOCOL_FEE_OFFSET = 24
```


### LP_FEE_OFFSET

```solidity
uint8 internal constant LP_FEE_OFFSET = 48
```


## Functions
### activeId


```solidity
function activeId(BinSlot0 _packed) internal pure returns (uint24 _activeId);
```

### protocolFee


```solidity
function protocolFee(BinSlot0 _packed) internal pure returns (uint24 _protocolFee);
```

### lpFee


```solidity
function lpFee(BinSlot0 _packed) internal pure returns (uint24 _lpFee);
```

### setActiveId


```solidity
function setActiveId(BinSlot0 _packed, uint24 _activeId) internal pure returns (BinSlot0 _result);
```

### setProtocolFee


```solidity
function setProtocolFee(BinSlot0 _packed, uint24 _protocolFee) internal pure returns (BinSlot0 _result);
```

### setLpFee


```solidity
function setLpFee(BinSlot0 _packed, uint24 _lpFee) internal pure returns (BinSlot0 _result);
```

