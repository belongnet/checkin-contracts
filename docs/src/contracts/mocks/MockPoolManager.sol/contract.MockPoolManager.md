# MockPoolManager
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/mocks/MockPoolManager.sol)

Minimal stub pool manager for wiring tests; returns static slot0/liquidity and reverts state-changing calls.


## State Variables
### slot0
Fixed slot0 used for reads.


```solidity
Slot0 public slot0 = Slot0({
    sqrtPriceX96: 79228162514264337593543950336, // 2^96 (price = 1.0)
    tick: 0,
    protocolFee: 0,
    lpFee: 0
})
```


### liquidity
Fixed liquidity value.


```solidity
uint128 public liquidity = 0
```


## Functions
### setSlot0

Set slot0 for tests.


```solidity
function setSlot0(uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee) external;
```

### setLiquidity

Set liquidity for tests.


```solidity
function setLiquidity(uint128 newLiquidity) external;
```

### getSlot0

Mimics ICLPoolManager.getSlot0.


```solidity
function getSlot0(bytes32) external view returns (uint160, int24, uint24, uint24);
```

### getLiquidity

Mimics ICLPoolManager.getLiquidity.


```solidity
function getLiquidity(bytes32) external view returns (uint128);
```

### modifyLiquidity

Revert on modifyLiquidity to make side effects explicit.


```solidity
function modifyLiquidity(bytes32, bytes calldata) external pure;
```

### swap

Revert on swap to make side effects explicit.


```solidity
function swap(bytes32, bytes calldata) external pure;
```

## Structs
### Slot0

```solidity
struct Slot0 {
    uint160 sqrtPriceX96;
    int24 tick;
    uint24 protocolFee;
    uint24 lpFee;
}
```

