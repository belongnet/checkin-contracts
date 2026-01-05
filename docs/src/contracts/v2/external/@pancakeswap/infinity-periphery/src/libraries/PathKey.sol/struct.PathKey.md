# PathKey
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/libraries/PathKey.sol)


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

