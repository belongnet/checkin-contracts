# ITransferValidator721
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/interfaces/ITransferValidator721.sol)

**Title:**
ITransferValidator721 Interface

Interface for validating NFT transfers for ERC721 tokens

This interface defines functions for validating transfers and managing token types


## Functions
### validateTransfer

Validates the transfer of a specific tokenId between addresses

Ensures that all transfer conditions are met before allowing the transfer


```solidity
function validateTransfer(address caller, address from, address to, uint256 tokenId) external view;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`caller`|`address`|The address that initiated the transfer|
|`from`|`address`|The address transferring the token|
|`to`|`address`|The address receiving the token|
|`tokenId`|`uint256`|The ID of the token being transferred|


### setTokenTypeOfCollection

Sets the token type for a specific collection


```solidity
function setTokenTypeOfCollection(address collection, uint16 tokenType) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`collection`|`address`|The address of the token collection|
|`tokenType`|`uint16`|The token type to be assigned to the collection|


