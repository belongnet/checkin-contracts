# CLPositionInfo
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-cl/libraries/CLPositionInfoLibrary.sol)

PositionInfo is a packed version of solidity structure.
Using the packaged version saves gas and memory by not storing the structure fields in memory slots.
Layout:
200 bits poolId | 24 bits tickUpper | 24 bits tickLower | 8 bits hasSubscriber
Fields in the direction from the least significant bit:
A flag to know if the tokenId is subscribed to an address
uint8 hasSubscriber;
The tickUpper of the position
int24 tickUpper;
The tickLower of the position
int24 tickLower;
The truncated poolId. Truncates a bytes32 value so the most signifcant (highest) 200 bits are used.
bytes25 poolId;
Note: If more bits are needed, hasSubscriber can be a single bit.


```solidity
type CLPositionInfo is uint256
```

