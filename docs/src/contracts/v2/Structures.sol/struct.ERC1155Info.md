# ERC1155Info
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/Structures.sol)

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

