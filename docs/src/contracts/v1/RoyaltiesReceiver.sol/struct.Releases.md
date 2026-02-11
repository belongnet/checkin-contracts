# Releases
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/RoyaltiesReceiver.sol)

Struct for tracking total released amounts and account-specific released amounts.


```solidity
struct Releases {
/// @notice The total amount of funds released from the contract.
uint256 totalReleased;
/// @notice A mapping to track the released amount per payee account.
mapping(address => uint256) released;
}
```

