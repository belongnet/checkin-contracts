# IInfinityRouter
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/IInfinityRouter.sol)

**Inherits:**
[ICLRouterBase](/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-cl/interfaces/ICLRouterBase.sol/interface.ICLRouterBase.md), [IBinRouterBase](/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-bin/interfaces/IBinRouterBase.sol/interface.IBinRouterBase.md)

**Title:**
IInfinityRouter

Interface containing all the structs and errors for different infinity swap types


## Errors
### TooLittleReceived
Emitted when an exactInput swap does not receive its minAmountOut


```solidity
error TooLittleReceived(uint256 minAmountOutReceived, uint256 amountReceived);
```

### TooMuchRequested
Emitted when an exactOutput is asked for more than its maxAmountIn


```solidity
error TooMuchRequested(uint256 maxAmountInRequested, uint256 amountRequested);
```

