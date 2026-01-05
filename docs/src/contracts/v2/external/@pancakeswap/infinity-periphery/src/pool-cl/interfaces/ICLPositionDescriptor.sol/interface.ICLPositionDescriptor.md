# ICLPositionDescriptor
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-cl/interfaces/ICLPositionDescriptor.sol)

**Title:**
Describes cl pool position NFT tokens via URI


## Functions
### tokenURI

Produces the URI describing a particular token ID

Note this URI may be a data: URI with the JSON contents directly inlined


```solidity
function tokenURI(ICLPositionManager positionManager, uint256 tokenId) external view returns (string memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`positionManager`|`ICLPositionManager`|The position manager for which to describe the token|
|`tokenId`|`uint256`|The ID of the token for which to produce a description, which may not be valid|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`string`|The URI of the ERC721-compliant metadata|


