# IEIP712
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-cl/interfaces/IEIP712.sol)

This interface is used for an EIP712 implementation


## Functions
### DOMAIN_SEPARATOR

Returns the domain separator for the current chain.

Uses cached version if chainid is unchanged from construction.


```solidity
function DOMAIN_SEPARATOR() external view returns (bytes32);
```

