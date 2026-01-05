# IQuoter
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/IQuoter.sol)

**Title:**
IQuoter

Supports quoting the delta amounts from exact input or exact output swaps.

These functions are not marked view because they rely on calling non-view functions and reverting
to compute the result. They are also not gas efficient and should not be called on-chain.


## Errors
### NotEnoughLiquidity

```solidity
error NotEnoughLiquidity(PoolId poolId);
```

### NotSelf

```solidity
error NotSelf();
```

### UnexpectedCallSuccess

```solidity
error UnexpectedCallSuccess();
```

## Structs
### QuoteExactSingleParams

```solidity
struct QuoteExactSingleParams {
    PoolKey poolKey;
    bool zeroForOne;
    uint128 exactAmount;
    bytes hookData;
}
```

### QuoteExactParams

```solidity
struct QuoteExactParams {
    Currency exactCurrency;
    PathKey[] path;
    uint128 exactAmount;
}
```

