# IBinFungibleToken
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-bin/interfaces/IBinFungibleToken.sol)


## Functions
### name


```solidity
function name() external view returns (string memory);
```

### symbol


```solidity
function symbol() external view returns (string memory);
```

### totalSupply


```solidity
function totalSupply(uint256 id) external view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`id`|`uint256`|ID of the token|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The total supply of token id|


### balanceOf

Get the balance of an account's tokens.


```solidity
function balanceOf(address account, uint256 id) external view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`account`|`address`|The address of the token holder|
|`id`|`uint256`|ID of the token|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The account's balance of the token type requested|


### balanceOfBatch

Get the balance of multiple account/token pairs


```solidity
function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids)
    external
    view
    returns (uint256[] memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`accounts`|`address[]`|The addresses of the token holders|
|`ids`|`uint256[]`|ID of the tokens|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256[]`|The account's balance of the token types requested (i.e. balance for each (owner, id) pair)|


### isApprovedForAll


```solidity
function isApprovedForAll(address owner, address spender) external view returns (bool);
```

### approveForAll

Enable or disable approval for a third party ("operator") to manage all of the caller's tokens.

MUST emit the ApprovalForAll event on success.


```solidity
function approveForAll(address operator, bool approved) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`operator`|`address`|Address to add to the set of authorized operators|
|`approved`|`bool`|True if the operator is approved, false to revoke approval|


### batchTransferFrom

Transfers `amounts` amount(s) of `ids` from the `from` address to the `to` address specified


```solidity
function batchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`from`|`address`|Source address|
|`to`|`address`|Target address|
|`ids`|`uint256[]`|IDs of each token type (order and length must match _values array)|
|`amounts`|`uint256[]`|Transfer amounts per token type (order and length must match _ids array)|


## Events
### TransferBatch

```solidity
event TransferBatch(
    address indexed sender, address indexed from, address indexed to, uint256[] ids, uint256[] amounts
);
```

### ApprovalForAll

```solidity
event ApprovalForAll(address indexed account, address indexed sender, bool approved);
```

## Errors
### BinFungibleToken_AddressThisOrZero

```solidity
error BinFungibleToken_AddressThisOrZero();
```

### BinFungibleToken_InvalidLength

```solidity
error BinFungibleToken_InvalidLength();
```

### BinFungibleToken_SelfApproval

```solidity
error BinFungibleToken_SelfApproval(address owner);
```

### BinFungibleToken_SpenderNotApproved

```solidity
error BinFungibleToken_SpenderNotApproved(address from, address spender);
```

### BinFungibleToken_TransferExceedsBalance

```solidity
error BinFungibleToken_TransferExceedsBalance(address from, uint256 id, uint256 amount);
```

### BinFungibleToken_BurnExceedsBalance

```solidity
error BinFungibleToken_BurnExceedsBalance(address from, uint256 id, uint256 amount);
```

