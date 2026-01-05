# VaultAppDeltaSettlement
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/libraries/VaultAppDeltaSettlement.sol)

Library for handling AppDeltaSettlement for the apps (eg. CL, Bin etc..)


## Functions
### accountAppDeltaWithHookDelta

helper method to call `vault.accountAppBalanceDelta`


```solidity
function accountAppDeltaWithHookDelta(IVault vault, PoolKey memory key, BalanceDelta delta, BalanceDelta hookDelta)
    internal;
```

