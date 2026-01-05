# IVaultToken
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/interfaces/IVaultToken.sol)


## Functions
### balanceOf

get the amount of owner's surplus token in vault


```solidity
function balanceOf(address owner, Currency currency) external view returns (uint256 balance);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`owner`|`address`|The address you want to query the balance of|
|`currency`|`Currency`|The currency you want to query the balance of|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`balance`|`uint256`|The balance of the specified address|


### allowance

get the amount that owner has authorized for spender to use


```solidity
function allowance(address owner, address spender, Currency currency) external view returns (uint256 amount);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`owner`|`address`|The address of the owner|
|`spender`|`address`|The address who is allowed to spend the owner's token|
|`currency`|`Currency`|The currency the spender is allowed to spend|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount`|`uint256`|The amount of token the spender is allowed to spend|


### approve

approve spender for using user's token


```solidity
function approve(address spender, Currency currency, uint256 amount) external returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`spender`|`address`|The address msg.sender is approving to spend the his token|
|`currency`|`Currency`|The currency the spender is allowed to spend|
|`amount`|`uint256`|The amount of token the spender is allowed to spend|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|bool Whether the approval was successful or not|


### transfer

transfer msg.sender's token to someone else


```solidity
function transfer(address to, Currency currency, uint256 amount) external returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`to`|`address`|The address to transfer the token to|
|`currency`|`Currency`|The currency to transfer|
|`amount`|`uint256`|The amount of token to transfer|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|bool Whether the transfer was successful or not|


### transferFrom

transfer from address's token on behalf of him


```solidity
function transferFrom(address from, address to, Currency currency, uint256 amount) external returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`from`|`address`|The address to transfer the token from|
|`to`|`address`|The address to transfer the token to|
|`currency`|`Currency`|The currency to transfer|
|`amount`|`uint256`|The amount of token to transfer|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|bool Whether the transfer was successful or not|


## Events
### OperatorSet

```solidity
event OperatorSet(address indexed owner, address indexed operator, bool approved);
```

### Approval

```solidity
event Approval(address indexed owner, address indexed spender, Currency indexed currency, uint256 amount);
```

### Transfer

```solidity
event Transfer(address caller, address indexed from, address indexed to, Currency indexed currency, uint256 amount);
```

