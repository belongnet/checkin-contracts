# Releases
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v1/RoyaltiesReceiver.sol)

Struct for tracking total released amounts and account-specific released amounts.


```solidity
struct Releases {
/// @notice The total amount of funds released from the contract.
uint256 totalReleased;
/// @notice A mapping to track the released amount per payee account.
mapping(address => uint256) released;
}
```

