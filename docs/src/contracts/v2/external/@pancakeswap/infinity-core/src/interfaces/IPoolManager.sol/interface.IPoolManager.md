# IPoolManager
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IPoolManager.sol)


## Functions
### updateDynamicLPFee

Updates lp fee for a dyanmic fee pool

Some of the use case could be:
1) when hook#beforeSwap() is called and hook call this function to update the lp fee
2) For BinPool only, when hook#beforeMint() is called and hook call this function to update the lp fee
3) other use case where the hook might want to on an ad-hoc basis increase/reduce lp fee


```solidity
function updateDynamicLPFee(PoolKey memory key, uint24 newDynamicLPFee) external;
```

### poolIdToPoolKey

Return PoolKey for a given PoolId


```solidity
function poolIdToPoolKey(PoolId id)
    external
    view
    returns (
        Currency currency0,
        Currency currency1,
        IHooks hooks,
        IPoolManager poolManager,
        uint24 fee,
        bytes32 parameters
    );
```

## Events
### DynamicLPFeeUpdated
Emitted when lp fee is updated

The event is emitted even if the updated fee value is the same as previous one


```solidity
event DynamicLPFeeUpdated(PoolId indexed id, uint24 dynamicLPFee);
```

## Errors
### PoolNotInitialized
Thrown when trying to interact with a non-initialized pool


```solidity
error PoolNotInitialized();
```

### CurrenciesInitializedOutOfOrder
PoolKey must have currencies where address(currency0) < address(currency1)


```solidity
error CurrenciesInitializedOutOfOrder(address currency0, address currency1);
```

### UnauthorizedDynamicLPFeeUpdate
Thrown when a call to updateDynamicLPFee is made by an address that is not the hook,
or on a pool is not a dynamic fee pool.


```solidity
error UnauthorizedDynamicLPFeeUpdate();
```

