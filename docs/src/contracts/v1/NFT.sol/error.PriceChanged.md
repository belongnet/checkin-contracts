# PriceChanged
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v1/NFT.sol)

Error thrown when the mint price changes unexpectedly.


```solidity
error PriceChanged(uint256 currentPrice);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`currentPrice`|`uint256`|The actual current mint price.|

