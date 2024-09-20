# Solidity API

## ITransferValidator721

Interface for validating NFT transfers for ERC721 tokens

_This interface defines functions for validating transfers and managing token types_

### validateTransfer

```solidity
function validateTransfer(address caller, address from, address to, uint256 tokenId) external view
```

Validates the transfer of a specific tokenId between addresses

_Ensures that all transfer conditions are met before allowing the transfer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | The address that initiated the transfer |
| from | address | The address transferring the token |
| to | address | The address receiving the token |
| tokenId | uint256 | The ID of the token being transferred |

### setTokenTypeOfCollection

```solidity
function setTokenTypeOfCollection(address collection, uint16 tokenType) external
```

Sets the token type for a specific collection

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | address | The address of the token collection |
| tokenType | uint16 | The token type to be assigned to the collection |

