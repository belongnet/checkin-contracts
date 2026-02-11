# IERC20
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/interfaces/IERC20.sol)


## Functions
### allowance

Returns the remaining number of tokens that `spender` will be
allowed to spend on behalf of `owner` through {transferFrom}. This is
zero by default.
This value changes when {approve} or {transferFrom} are called.


```solidity
function allowance(address owner, address spender) external view returns (uint256);
```

