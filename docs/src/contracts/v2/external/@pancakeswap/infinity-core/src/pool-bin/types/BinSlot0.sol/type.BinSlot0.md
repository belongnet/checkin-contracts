# BinSlot0
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/pool-bin/types/BinSlot0.sol)

BinSlot0 is a packed version of solidity structure.
Using the packaged version saves gas by not storing the structure fields in memory slots.
Layout:
184 bits empty | 24 bits lpFee | 12 bits protocolFee 1->0 | 12 bits protocolFee 0->1 | 24 bits activeId
Fields in the direction from the least significant bit:
The current activeId
uint24 activeId;
Protocol fee, expressed in hundredths of a bip, upper 12 bits are for 1->0, and the lower 12 are for 0->1
the maximum is 1000 - meaning the maximum protocol fee is 0.1%
the protocolFee is taken from the input first, then the lpFee is taken from the remaining input
uint24 protocolFee;
The current LP fee of the pool. If the pool is dynamic, this does not include the dynamic fee flag.
uint24 lpFee;


```solidity
type BinSlot0 is bytes32
```

