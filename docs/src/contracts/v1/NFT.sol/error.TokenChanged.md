# TokenChanged
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v1/NFT.sol)

Error thrown when the paying token changes unexpectedly.


```solidity
error TokenChanged(address currentPayingToken);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`currentPayingToken`|`address`|The actual current paying token.|

