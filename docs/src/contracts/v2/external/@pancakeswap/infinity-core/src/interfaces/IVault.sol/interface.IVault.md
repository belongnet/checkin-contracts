# IVault
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IVault.sol)

**Inherits:**
[IVaultToken](/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IVaultToken.sol/interface.IVaultToken.md)


## Functions
### isAppRegistered


```solidity
function isAppRegistered(address app) external returns (bool);
```

### reservesOfApp

Returns the reserves for a a given pool type and currency


```solidity
function reservesOfApp(address app, Currency currency) external view returns (uint256);
```

### registerApp

register an app so that it can perform accounting base on vault


```solidity
function registerApp(address app) external;
```

### getLocker

Returns the locker who is locking the vault


```solidity
function getLocker() external view returns (address locker);
```

### getVaultReserve

Returns the reserve and its amount that is currently being stored in trnasient storage


```solidity
function getVaultReserve() external view returns (Currency, uint256);
```

### getUnsettledDeltasCount

Returns lock data


```solidity
function getUnsettledDeltasCount() external view returns (uint256 count);
```

### currencyDelta

Get the current delta for a locker in the given currency


```solidity
function currencyDelta(address settler, Currency currency) external view returns (int256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`settler`|`address`||
|`currency`|`Currency`|The currency for which to lookup the delta|


### lock

All operations go through this function


```solidity
function lock(bytes calldata data) external returns (bytes memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`data`|`bytes`|Any data to pass to the callback, via `ILockCallback(msg.sender).lockCallback(data)`|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bytes`|The data returned by the call to `ILockCallback(msg.sender).lockCallback(data)`|


### accountAppBalanceDelta

Called by registered app to account for a change in the pool balance,
convenient for AMM pool manager, typically after modifyLiquidity, swap, donate,
include the case where hookDelta is involved


```solidity
function accountAppBalanceDelta(
    Currency currency0,
    Currency currency1,
    BalanceDelta delta,
    address settler,
    BalanceDelta hookDelta,
    address hook
) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`currency0`|`Currency`|The PoolKey currency0 to update|
|`currency1`|`Currency`|The PoolKey currency1 to update|
|`delta`|`BalanceDelta`|The change in the pool's balance|
|`settler`|`address`|The address whose delta will be updated|
|`hookDelta`|`BalanceDelta`|The change in the pool's balance from hook|
|`hook`|`address`|The address whose hookDelta will be updated|


### accountAppBalanceDelta

Called by registered app to account for a change in the pool balance,
convenient for AMM pool manager, typically after modifyLiquidity, swap, donate


```solidity
function accountAppBalanceDelta(Currency currency0, Currency currency1, BalanceDelta delta, address settler)
    external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`currency0`|`Currency`|The PoolKey currency0 to update|
|`currency1`|`Currency`|The PoolKey currency1 to update|
|`delta`|`BalanceDelta`|The change in the pool's balance|
|`settler`|`address`|The address whose delta will be updated|


### accountAppBalanceDelta

This works as a general accounting mechanism for non-dex app


```solidity
function accountAppBalanceDelta(Currency currency, int128 delta, address settler) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`currency`|`Currency`|The currency to update|
|`delta`|`int128`|The change in the balance|
|`settler`|`address`|The address whose delta will be updated|


### take

Called by the user to net out some value owed to the user

Will revert if the requested amount is not available, consider using `mint` instead

Can also be used as a mechanism for free flash loans


```solidity
function take(Currency currency, address to, uint256 amount) external;
```

### sync

Writes the current ERC20 balance of the specified currency to transient storage
This is used to checkpoint balances for the manager and derive deltas for the caller.

This MUST be called before any ERC20 tokens are sent into the contract, but can be skipped
for native tokens because the amount to settle is determined by the sent value.
However, if an ERC20 token has been synced and not settled, and the caller instead wants to settle
native funds, this function can be called with the native currency to then be able to settle the native currency


```solidity
function sync(Currency token0) external;
```

### settle

Called by the user to pay what is owed


```solidity
function settle() external payable returns (uint256 paid);
```

### settleFor

Called by the user to pay on behalf of another address


```solidity
function settleFor(address recipient) external payable returns (uint256 paid);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`recipient`|`address`|The address to credit for the payment|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`paid`|`uint256`|The amount of currency settled|


### clear

WARNING - Any currency that is cleared, will be non-retreivable, and locked in the contract permanently.
A call to clear will zero out a positive balance WITHOUT a corresponding transfer.

This could be used to clear a balance that is considered dust.
Additionally, the amount must be the exact positive balance. This is to enforce that the caller is aware of the amount being cleared.


```solidity
function clear(Currency currency, uint256 amount) external;
```

### collectFee

Called by app to collect any fee related

no restriction on caller, underflow happen if caller collect more than the reserve


```solidity
function collectFee(Currency currency, uint256 amount, address recipient) external;
```

### mint

Called by the user to store surplus tokens in the vault


```solidity
function mint(address to, Currency currency, uint256 amount) external;
```

### burn

Called by the user to use surplus tokens for payment settlement


```solidity
function burn(address from, Currency currency, uint256 amount) external;
```

## Events
### AppRegistered

```solidity
event AppRegistered(address indexed app);
```

## Errors
### AppUnregistered
Thrown when a app is not registered


```solidity
error AppUnregistered();
```

### CurrencyNotSettled
Thrown when a currency is not netted out after a lock


```solidity
error CurrencyNotSettled();
```

### LockerAlreadySet
Thrown when there is already a locker


```solidity
error LockerAlreadySet(address locker);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`locker`|`address`|The address of the current locker|

### SettleNonNativeCurrencyWithValue
Thrown when passing in msg.value for non-native currency


```solidity
error SettleNonNativeCurrencyWithValue();
```

### MustClearExactPositiveDelta
Thrown when `clear` is called with an amount that is not exactly equal to the open currency delta.


```solidity
error MustClearExactPositiveDelta();
```

### NoLocker
Thrown when there is no locker


```solidity
error NoLocker();
```

### FeeCurrencySynced
Thrown when collectFee is attempted on a token that is synced.


```solidity
error FeeCurrencySynced();
```

