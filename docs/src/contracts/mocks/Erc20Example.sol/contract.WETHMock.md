# WETHMock
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/mocks/Erc20Example.sol)

**Inherits:**
ERC20

**Title:**
WETHMock

Simple ERC20 mock (18 decimals) with an open `mint` function for testing.


## Functions
### constructor


```solidity
constructor() ERC20("WETH Mock", "WETHm");
```

### mint

Mints `amount` tokens to `to`.


```solidity
function mint(address to, uint256 amount) public;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`to`|`address`|Recipient address.|
|`amount`|`uint256`|Amount to mint (18 decimals).|


