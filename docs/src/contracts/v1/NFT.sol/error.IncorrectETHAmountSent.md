# IncorrectETHAmountSent
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/NFT.sol)

Error thrown when insufficient ETH is sent for a minting transaction.


```solidity
error IncorrectETHAmountSent(uint256 ETHsent);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`ETHsent`|`uint256`|The amount of ETH sent.|

