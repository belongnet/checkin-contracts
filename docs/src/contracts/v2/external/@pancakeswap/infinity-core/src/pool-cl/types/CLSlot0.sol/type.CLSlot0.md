# CLSlot0
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/pool-cl/types/CLSlot0.sol)

CLSlot0 is a packed version of solidity structure.
Using the packaged version saves gas by not storing the structure fields in memory slots.
Layout:
24 bits empty | 24 bits lpFee | 12 bits protocolFee 1->0 | 12 bits protocolFee 0->1 | 24 bits tick | 160 bits sqrtPriceX96
Fields in the direction from the least significant bit:
The current price
uint160 sqrtPriceX96;
The current tick
int24 tick;
Protocol fee, expressed in hundredths of a bip, upper 12 bits are for 1->0, and the lower 12 are for 0->1
the maximum is 1000 - meaning the maximum protocol fee is 0.1%
the protocolFee is taken from the input first, then the lpFee is taken from the remaining input
uint24 protocolFee;
The current LP fee of the pool. If the pool is dynamic, this does not include the dynamic fee flag.
uint24 lpFee;


```solidity
type CLSlot0 is bytes32
```

