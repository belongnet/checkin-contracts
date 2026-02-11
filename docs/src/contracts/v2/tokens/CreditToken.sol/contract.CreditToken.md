# CreditToken
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/tokens/CreditToken.sol)

**Inherits:**
[ERC1155Base](/contracts/v2/tokens/base/ERC1155Base.sol/contract.ERC1155Base.md)

**Title:**
CreditToken

Minimal-proxy (cloneable) ERC-1155 credit system used for tracking USD-denominated credits.


- Deployed by the `Factory` via `cloneDeterministic`.
- Initialization wires roles, base URI, and collection metadata via `ERC1155Base`.


## Functions
### initialize

Initializes the ERC-1155 credit collection.

Must be called exactly once on the freshly cloned proxy.


```solidity
function initialize(ERC1155Info calldata info) external initializer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`info`|`ERC1155Info`|Initialization struct (admin/manager/minter/burner/uri/name/symbol).|


