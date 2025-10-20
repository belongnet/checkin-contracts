# Solidity API

## CreditToken

Minimal-proxy (cloneable) ERC-1155 credit system used for tracking USD-denominated credits.
@dev
- Deployed by the `Factory` via `cloneDeterministic`.
- Initialization wires roles, base URI, and collection metadata via `ERC1155Base`.

### initialize

```solidity
function initialize(struct ERC1155Info info) external
```

Initializes the ERC-1155 credit collection.

_Must be called exactly once on the freshly cloned proxy._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| info | struct ERC1155Info | Initialization struct (admin/manager/minter/burner/uri/name/symbol). |

