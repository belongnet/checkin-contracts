# IEIP712
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-cl/interfaces/IEIP712.sol)

This interface is used for an EIP712 implementation


## Functions
### DOMAIN_SEPARATOR

Returns the domain separator for the current chain.

Uses cached version if chainid is unchanged from construction.


```solidity
function DOMAIN_SEPARATOR() external view returns (bytes32);
```

