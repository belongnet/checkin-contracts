# TokenChanged
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/NFT.sol)

Error thrown when the paying token changes unexpectedly.


```solidity
error TokenChanged(address currentPayingToken);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`currentPayingToken`|`address`|The actual current paying token.|

