# Solidity API

## ERC1155Base

Base upgradeable ERC-1155 with role-gated admin, manager, minter and burner flows,
        collection-level URI, per-token URI, and a global transferability switch.
@dev
- Uses Solady's `EnumerableRoles` for role management with custom 256-bit role IDs.
- `transferable` gate is enforced in `_beforeTokenTransfer` for non-mint/burn transfers.
- Initialize via `_initialize_ERC1155Base(ERC1155Info)` in child `initialize`.

### TokenCanNotBeTransfered

```solidity
error TokenCanNotBeTransfered()
```

Thrown when attempting to transfer tokens while `transferable` is false.

### UriSet

```solidity
event UriSet(string uri)
```

Emitted when the collection-level URI is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| uri | string | New collection URI. |

### TokenUriSet

```solidity
event TokenUriSet(uint256 tokenId, string tokenUri)
```

Emitted when a token-specific URI is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The token id whose URI changed. |
| tokenUri | string | New token URI. |

### TransferableSet

```solidity
event TransferableSet(bool transferable)
```

Emitted when the global transferability flag is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| transferable | bool | New transferability value. |

### DEFAULT_ADMIN_ROLE

```solidity
uint256 DEFAULT_ADMIN_ROLE
```

Role: default admin.

### MANAGER_ROLE

```solidity
uint256 MANAGER_ROLE
```

Role: collection manager (URI/transferability).

### MINTER_ROLE

```solidity
uint256 MINTER_ROLE
```

Role: minter (mint).

### BURNER_ROLE

```solidity
uint256 BURNER_ROLE
```

Role: burner (burn).

### name

```solidity
string name
```

Human-readable collection name.

### symbol

```solidity
string symbol
```

Human-readable collection symbol.

### transferable

```solidity
bool transferable
```

Global flag controlling whether user-to-user transfers are allowed.

### _initialize_ERC1155Base

```solidity
function _initialize_ERC1155Base(struct ERC1155Info info) internal
```

Initializes base ERC-1155 state (roles, URIs, transferability).

_Must be called exactly once by derived `initialize`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| info | struct ERC1155Info | Initialization payload (roles, URIs, flags, metadata). |

### setURI

```solidity
function setURI(string uri_) public
```

Updates the collection-level URI.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| uri_ | string | New collection URI. |

### setTransferable

```solidity
function setTransferable(bool _transferable) public
```

Updates the global transferability switch.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _transferable | bool | New transferability value. |

### mint

```solidity
function mint(address to, uint256 tokenId, uint256 amount, string tokenUri) public
```

Mints `amount` of `tokenId` to `to` and sets its token URI.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient address. |
| tokenId | uint256 | Token id to mint. |
| amount | uint256 | Amount to mint. |
| tokenUri | string | Token-specific URI to set (overrides collection URI). |

### burn

```solidity
function burn(address from, uint256 tokenId, uint256 amount) public
```

Burns `amount` of `tokenId` from `from` and clears its token URI.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | Address to burn from. |
| tokenId | uint256 | Token id to burn. |
| amount | uint256 | Amount to burn. |

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256[] ids, uint256[] amounts, bytes data) internal
```

_Reverts with `TokenCanNotBeTransfered()` for user-to-user transfers when `transferable` is false._

### uri

```solidity
function uri() public view returns (string)
```

Returns the collection-level URI.

### uri

```solidity
function uri(uint256 tokenId) public view returns (string)
```

_Returns the URI for token `id`.

You can either return the same templated URI for all token IDs,
(e.g. "https://example.com/api/{id}.json"),
or return a unique URI for each `id`.

See: https://eips.ethereum.org/EIPS/eip-1155#metadata_

### _useBeforeTokenTransfer

```solidity
function _useBeforeTokenTransfer() internal pure returns (bool)
```

_Signals that `_beforeTokenTransfer` is used to help the compiler trim dead code._

