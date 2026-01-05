# IncorrectETHAmountSent
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v1/NFT.sol)

Error thrown when insufficient ETH is sent for a minting transaction.


```solidity
error IncorrectETHAmountSent(uint256 ETHsent);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`ETHsent`|`uint256`|The amount of ETH sent.|

