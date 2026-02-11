# Allowance
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/lib/permit2/src/libraries/Allowance.sol)


## State Variables
### BLOCK_TIMESTAMP_EXPIRATION

```solidity
uint256 private constant BLOCK_TIMESTAMP_EXPIRATION = 0
```


## Functions
### updateAll

Sets the allowed amount, expiry, and nonce of the spender's permissions on owner's token.

Nonce is incremented.

If the inputted expiration is 0, the stored expiration is set to block.timestamp


```solidity
function updateAll(
    IAllowanceTransfer.PackedAllowance storage allowed,
    uint160 amount,
    uint48 expiration,
    uint48 nonce
) internal;
```

### updateAmountAndExpiration

Sets the allowed amount and expiry of the spender's permissions on owner's token.

Nonce does not need to be incremented.


```solidity
function updateAmountAndExpiration(
    IAllowanceTransfer.PackedAllowance storage allowed,
    uint160 amount,
    uint48 expiration
) internal;
```

### pack

Computes the packed slot of the amount, expiration, and nonce that make up PackedAllowance


```solidity
function pack(uint160 amount, uint48 expiration, uint48 nonce) internal pure returns (uint256 word);
```

