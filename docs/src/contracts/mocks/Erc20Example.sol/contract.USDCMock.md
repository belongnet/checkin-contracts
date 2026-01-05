# USDCMock
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/mocks/Erc20Example.sol)

**Inherits:**
ERC20

**Title:**
USDCMock

Simple ERC20 mock with 6 decimals and an open `mint` function for testing.


## Functions
### constructor


```solidity
constructor() ERC20("USDC Mock", "USDCm");
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
|`amount`|`uint256`|Amount to mint (6 decimals).|


### decimals

Returns 6 to emulate USDC decimals.


```solidity
function decimals() public pure override returns (uint8);
```

