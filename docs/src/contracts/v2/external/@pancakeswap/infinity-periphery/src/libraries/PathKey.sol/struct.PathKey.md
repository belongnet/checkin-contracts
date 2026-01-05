# PathKey
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/libraries/PathKey.sol)


```solidity
struct PathKey {
Currency intermediateCurrency;
uint24 fee;
IHooks hooks;
IPoolManager poolManager;
bytes hookData;
bytes32 parameters;
}
```

