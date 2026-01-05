# DualDexSwapV4LibHarness
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/mocks/DualDexSwapV4LibHarness.sol)

Thin harness exposing DualDexSwapV4Lib entrypoints for testing.


## Functions
### swapExact


```solidity
function swapExact(DualDexSwapV4Lib.PaymentsInfo memory info, DualDexSwapV4Lib.ExactInputSingleParams memory params)
    external
    returns (uint256 received);
```

### swapExactPath


```solidity
function swapExactPath(
    DualDexSwapV4Lib.PaymentsInfo memory info,
    DualDexSwapV4Lib.ExactInputMultiParams memory params
) external returns (uint256 received);
```

### swapUSDtokenToLONG


```solidity
function swapUSDtokenToLONG(
    DualDexSwapV4Lib.PaymentsInfo memory info,
    address recipient,
    uint256 amount,
    uint256 amountOutMinimum,
    uint256 deadline
) external returns (uint256 swapped);
```

### swapLONGtoUSDtoken


```solidity
function swapLONGtoUSDtoken(
    DualDexSwapV4Lib.PaymentsInfo memory info,
    address recipient,
    uint256 amount,
    uint256 amountOutMinimum,
    uint256 deadline
) external returns (uint256 swapped);
```

### approveToken


```solidity
function approveToken(address token, address spender, uint256 amount) external;
```

