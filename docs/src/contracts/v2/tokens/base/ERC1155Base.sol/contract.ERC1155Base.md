# ERC1155Base
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/tokens/base/ERC1155Base.sol)

**Inherits:**
Initializable, ERC1155, Ownable, EnumerableRoles

**Title:**
ERC1155Base

Base upgradeable ERC-1155 with role-gated admin, manager, minter and burner flows,
collection-level URI, per-token URI, and a global transferability switch.


- Uses Solady's `EnumerableRoles` for role management with custom 256-bit role IDs.
- `transferable` gate is enforced in `_beforeTokenTransfer` for non-mint/burn transfers.
- Initialize via `_initialize_ERC1155Base(ERC1155Info)` in child `initialize`.


## State Variables
### DEFAULT_ADMIN_ROLE
Role: default admin.


```solidity
uint256 public constant DEFAULT_ADMIN_ROLE = uint256(keccak256("DEFAULT_ADMIN_ROLE"))
```


### MANAGER_ROLE
Role: collection manager (URI/transferability).


```solidity
uint256 public constant MANAGER_ROLE = uint256(keccak256("MANAGER_ROLE"))
```


### MINTER_ROLE
Role: minter (mint).


```solidity
uint256 public constant MINTER_ROLE = uint256(keccak256("MINTER_ROLE"))
```


### BURNER_ROLE
Role: burner (burn).


```solidity
uint256 public constant BURNER_ROLE = uint256(keccak256("BURNER_ROLE"))
```


### name
Human-readable collection name.


```solidity
string public name
```


### symbol
Human-readable collection symbol.


```solidity
string public symbol
```


### transferable
Global flag controlling whether user-to-user transfers are allowed.


```solidity
bool public transferable
```


### _uri
Collection-level base URI.


```solidity
string private _uri
```


### _tokenUri
Per-token URI overrides.


```solidity
mapping(uint256 tokenId => string tokenUri) private _tokenUri
```


## Functions
### _initialize_ERC1155Base

Initializes base ERC-1155 state (roles, URIs, transferability).

Must be called exactly once by derived `initialize`.


```solidity
function _initialize_ERC1155Base(ERC1155Info calldata info) internal;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`info`|`ERC1155Info`|Initialization payload (roles, URIs, flags, metadata).|


### setURI

Updates the collection-level URI.


```solidity
function setURI(string calldata uri_) public onlyRole(MANAGER_ROLE);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`uri_`|`string`|New collection URI.|


### setTokenUri

Setter for token-specific URI.


```solidity
function setTokenUri(uint256 tokenId, string memory tokenUri) public onlyRole(MANAGER_ROLE);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tokenId`|`uint256`|Token id.|
|`tokenUri`|`string`|New token URI.|


### setTransferable

Updates the global transferability switch.


```solidity
function setTransferable(bool _transferable) public onlyRole(MANAGER_ROLE);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_transferable`|`bool`|New transferability value.|


### mint

Mints `amount` of `tokenId` to `to` and sets its token URI.


```solidity
function mint(address to, uint256 tokenId, uint256 amount) public onlyRole(MINTER_ROLE);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`to`|`address`|Recipient address.|
|`tokenId`|`uint256`|Token id to mint.|
|`amount`|`uint256`|Amount to mint.|


### burn

Burns `amount` of `tokenId` from `from` and clears its token URI.


```solidity
function burn(address from, uint256 tokenId, uint256 amount) public onlyRole(BURNER_ROLE);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`from`|`address`|Address to burn from.|
|`tokenId`|`uint256`|Token id to burn.|
|`amount`|`uint256`|Amount to burn.|


### _setUri

Internal setter for collection URI.


```solidity
function _setUri(string calldata uri_) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`uri_`|`string`|New collection URI.|


### _setTokenUri

Internal setter for token-specific URI.


```solidity
function _setTokenUri(uint256 tokenId, string memory tokenUri) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tokenId`|`uint256`|Token id.|
|`tokenUri`|`string`|New token URI.|


### _setTransferable

Internal setter for transferability flag.


```solidity
function _setTransferable(bool _transferable) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_transferable`|`bool`|New transferability value.|


### _beforeTokenTransfer

Reverts with `TokenCanNotBeTransfered()` for user-to-user transfers when `transferable` is false.


```solidity
function _beforeTokenTransfer(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
) internal override;
```

### uri

Returns the URI for token `id`.
You can either return the same templated URI for all token IDs,
(e.g. "https://example.com/api/{id}.json"),
or return a unique URI for each `id`.
See: https://eips.ethereum.org/EIPS/eip-1155#metadata


```solidity
function uri(uint256 tokenId) public view override returns (string memory);
```

### _useBeforeTokenTransfer

Signals that `_beforeTokenTransfer` is used to help the compiler trim dead code.


```solidity
function _useBeforeTokenTransfer() internal pure override returns (bool);
```

## Events
### UriSet
Emitted when the collection-level URI is updated.


```solidity
event UriSet(string uri);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`uri`|`string`|New collection URI.|

### TokenUriSet
Emitted when a token-specific URI is updated.


```solidity
event TokenUriSet(uint256 tokenId, string tokenUri);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tokenId`|`uint256`|The token id whose URI changed.|
|`tokenUri`|`string`|New token URI.|

### TransferableSet
Emitted when the global transferability flag is updated.


```solidity
event TransferableSet(bool transferable);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`transferable`|`bool`|New transferability value.|

## Errors
### TokenCanNotBeTransfered
Thrown when attempting to transfer tokens while `transferable` is false.


```solidity
error TokenCanNotBeTransfered();
```

