# ICLRouterBase
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-cl/interfaces/ICLRouterBase.sol)

**Inherits:**
[IImmutableState](/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/IImmutableState.sol/interface.IImmutableState.md)


## Structs
### CLSwapExactInputSingleParams
Parameters for a single-hop exact-input swap


```solidity
struct CLSwapExactInputSingleParams {
    PoolKey poolKey;
    bool zeroForOne;
    uint128 amountIn;
    uint128 amountOutMinimum;
    bytes hookData;
}
```

### CLSwapExactInputParams
Parameters for a multi-hop exact-input swap


```solidity
struct CLSwapExactInputParams {
    Currency currencyIn;
    PathKey[] path;
    uint128 amountIn;
    uint128 amountOutMinimum;
}
```

### CLSwapExactOutputSingleParams
Parameters for a single-hop exact-output swap


```solidity
struct CLSwapExactOutputSingleParams {
    PoolKey poolKey;
    bool zeroForOne;
    uint128 amountOut;
    uint128 amountInMaximum;
    bytes hookData;
}
```

### CLSwapExactOutputParams
Parameters for a multi-hop exact-output swap


```solidity
struct CLSwapExactOutputParams {
    Currency currencyOut;
    PathKey[] path;
    uint128 amountOut;
    uint128 amountInMaximum;
}
```

