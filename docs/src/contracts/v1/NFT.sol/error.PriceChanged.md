# PriceChanged
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/NFT.sol)

Error thrown when the mint price changes unexpectedly.


```solidity
error PriceChanged(uint256 currentPrice);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`currentPrice`|`uint256`|The actual current mint price.|

