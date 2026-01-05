# CurrencyLibrary
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/types/Currency.sol)

**Title:**
CurrencyLibrary

This library allows for transferring and holding native tokens and ERC20 tokens


## State Variables
### NATIVE
A constant to represent the native currency


```solidity
Currency public constant NATIVE = Currency.wrap(address(0))
```


## Functions
### transfer


```solidity
function transfer(Currency currency, address to, uint256 amount) internal;
```

### balanceOfSelf


```solidity
function balanceOfSelf(Currency currency) internal view returns (uint256);
```

### balanceOf


```solidity
function balanceOf(Currency currency, address owner) internal view returns (uint256);
```

### isNative


```solidity
function isNative(Currency currency) internal pure returns (bool);
```

### toId


```solidity
function toId(Currency currency) internal pure returns (uint256);
```

### fromId


```solidity
function fromId(uint256 id) internal pure returns (Currency);
```

## Errors
### NativeTransferFailed
Additional context for ERC-7751 wrapped error when a native transfer fails


```solidity
error NativeTransferFailed();
```

### ERC20TransferFailed
Additional context for ERC-7751 wrapped error when an ERC20 transfer fails


```solidity
error ERC20TransferFailed();
```

