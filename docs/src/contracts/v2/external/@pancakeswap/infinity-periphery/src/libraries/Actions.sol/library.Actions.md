# Actions
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/libraries/Actions.sol)

Library to define different pool actions.

These are suggested common commands, however additional commands should be defined as required
Some of these actions are not supported in the Router contracts or Position Manager contracts, but are left as they may be helpful commands for other peripheral contracts.


## State Variables
### CL_INCREASE_LIQUIDITY

```solidity
uint256 internal constant CL_INCREASE_LIQUIDITY = 0x00
```


### CL_DECREASE_LIQUIDITY

```solidity
uint256 internal constant CL_DECREASE_LIQUIDITY = 0x01
```


### CL_MINT_POSITION

```solidity
uint256 internal constant CL_MINT_POSITION = 0x02
```


### CL_BURN_POSITION

```solidity
uint256 internal constant CL_BURN_POSITION = 0x03
```


### CL_INCREASE_LIQUIDITY_FROM_DELTAS

```solidity
uint256 internal constant CL_INCREASE_LIQUIDITY_FROM_DELTAS = 0x04
```


### CL_MINT_POSITION_FROM_DELTAS

```solidity
uint256 internal constant CL_MINT_POSITION_FROM_DELTAS = 0x05
```


### CL_SWAP_EXACT_IN_SINGLE

```solidity
uint256 internal constant CL_SWAP_EXACT_IN_SINGLE = 0x06
```


### CL_SWAP_EXACT_IN

```solidity
uint256 internal constant CL_SWAP_EXACT_IN = 0x07
```


### CL_SWAP_EXACT_OUT_SINGLE

```solidity
uint256 internal constant CL_SWAP_EXACT_OUT_SINGLE = 0x08
```


### CL_SWAP_EXACT_OUT

```solidity
uint256 internal constant CL_SWAP_EXACT_OUT = 0x09
```


### CL_DONATE
this is not supported in the position manager or router


```solidity
uint256 internal constant CL_DONATE = 0x0a
```


### SETTLE

```solidity
uint256 internal constant SETTLE = 0x0b
```


### SETTLE_ALL

```solidity
uint256 internal constant SETTLE_ALL = 0x0c
```


### SETTLE_PAIR

```solidity
uint256 internal constant SETTLE_PAIR = 0x0d
```


### TAKE

```solidity
uint256 internal constant TAKE = 0x0e
```


### TAKE_ALL

```solidity
uint256 internal constant TAKE_ALL = 0x0f
```


### TAKE_PORTION

```solidity
uint256 internal constant TAKE_PORTION = 0x10
```


### TAKE_PAIR

```solidity
uint256 internal constant TAKE_PAIR = 0x11
```


### CLOSE_CURRENCY

```solidity
uint256 internal constant CLOSE_CURRENCY = 0x12
```


### CLEAR_OR_TAKE

```solidity
uint256 internal constant CLEAR_OR_TAKE = 0x13
```


### SWEEP

```solidity
uint256 internal constant SWEEP = 0x14
```


### WRAP

```solidity
uint256 internal constant WRAP = 0x15
```


### UNWRAP

```solidity
uint256 internal constant UNWRAP = 0x16
```


### MINT_6909
this is not supported in the position manager or router


```solidity
uint256 internal constant MINT_6909 = 0x17
```


### BURN_6909

```solidity
uint256 internal constant BURN_6909 = 0x18
```


### BIN_ADD_LIQUIDITY

```solidity
uint256 internal constant BIN_ADD_LIQUIDITY = 0x19
```


### BIN_REMOVE_LIQUIDITY

```solidity
uint256 internal constant BIN_REMOVE_LIQUIDITY = 0x1a
```


### BIN_ADD_LIQUIDITY_FROM_DELTAS

```solidity
uint256 internal constant BIN_ADD_LIQUIDITY_FROM_DELTAS = 0x1b
```


### BIN_SWAP_EXACT_IN_SINGLE

```solidity
uint256 internal constant BIN_SWAP_EXACT_IN_SINGLE = 0x1c
```


### BIN_SWAP_EXACT_IN

```solidity
uint256 internal constant BIN_SWAP_EXACT_IN = 0x1d
```


### BIN_SWAP_EXACT_OUT_SINGLE

```solidity
uint256 internal constant BIN_SWAP_EXACT_OUT_SINGLE = 0x1e
```


### BIN_SWAP_EXACT_OUT

```solidity
uint256 internal constant BIN_SWAP_EXACT_OUT = 0x1f
```


### BIN_DONATE

```solidity
uint256 internal constant BIN_DONATE = 0x20
```


