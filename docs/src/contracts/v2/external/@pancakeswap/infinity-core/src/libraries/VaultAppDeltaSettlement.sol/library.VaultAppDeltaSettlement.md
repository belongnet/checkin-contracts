# VaultAppDeltaSettlement
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/libraries/VaultAppDeltaSettlement.sol)

Library for handling AppDeltaSettlement for the apps (eg. CL, Bin etc..)


## Functions
### accountAppDeltaWithHookDelta

helper method to call `vault.accountAppBalanceDelta`


```solidity
function accountAppDeltaWithHookDelta(IVault vault, PoolKey memory key, BalanceDelta delta, BalanceDelta hookDelta)
    internal;
```

