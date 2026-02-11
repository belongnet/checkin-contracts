# CustomRevert
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-core/src/libraries/CustomRevert.sol)

**Title:**
Library for reverting with custom errors efficiently

Contains functions for reverting with custom errors with different argument types efficiently

The functions may tamper with the free memory pointer but it is fine since the call context is exited immediately


## Functions
### bubbleUpAndRevertWith

bubble up the revert message returned by a call and revert with a wrapped ERC-7751 error

this method can be vulnerable to revert data bombs


```solidity
function bubbleUpAndRevertWith(
    address revertingContract,
    bytes4 revertingFunctionSelector,
    bytes4 additionalContext
) internal pure;
```

## Errors
### WrappedError
ERC-7751 error for wrapping bubbled up reverts


```solidity
error WrappedError(address target, bytes4 selector, bytes reason, bytes details);
```

