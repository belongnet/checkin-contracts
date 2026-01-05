# IBinRouterBase
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-bin/interfaces/IBinRouterBase.sol)

**Inherits:**
[IImmutableState](/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/IImmutableState.sol/interface.IImmutableState.md)


## Structs
### BinSwapExactInputSingleParams

```solidity
struct BinSwapExactInputSingleParams {
    PoolKey poolKey;
    bool swapForY;
    uint128 amountIn;
    uint128 amountOutMinimum;
    bytes hookData;
}
```

### BinSwapExactInputParams

```solidity
struct BinSwapExactInputParams {
    Currency currencyIn;
    PathKey[] path;
    uint128 amountIn;
    uint128 amountOutMinimum;
}
```

### BinSwapExactOutputSingleParams

```solidity
struct BinSwapExactOutputSingleParams {
    PoolKey poolKey;
    bool swapForY;
    uint128 amountOut;
    uint128 amountInMaximum;
    bytes hookData;
}
```

### BinSwapExactOutputParams

```solidity
struct BinSwapExactOutputParams {
    Currency currencyOut;
    PathKey[] path;
    uint128 amountOut;
    uint128 amountInMaximum;
}
```

