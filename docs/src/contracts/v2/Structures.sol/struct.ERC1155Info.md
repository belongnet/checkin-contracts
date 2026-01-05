# ERC1155Info
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/Structures.sol)

**Title:**
ERC1155Info

Initialization/configuration data for a CreditToken (ERC-1155) collection.


```solidity
struct ERC1155Info {
address defaultAdmin;
bool transferable;
address manager;
address minter;
address burner;
string name;
string symbol;
string uri;
}
```

