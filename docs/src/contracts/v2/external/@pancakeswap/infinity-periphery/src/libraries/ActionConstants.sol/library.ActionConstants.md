# ActionConstants
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/libraries/ActionConstants.sol)

**Title:**
Action Constants

Common constants used in actions

Constants are gas efficient alternatives to their literal values


## State Variables
### OPEN_DELTA
used to signal that an action should use the input value of the open delta on the vault
or of the balance that the contract holds


```solidity
uint128 internal constant OPEN_DELTA = 0
```


### CONTRACT_BALANCE
used to signal that an action should use the contract's entire balance of a currency
This value is equivalent to 1<<255, i.e. a singular 1 in the most significant bit.


```solidity
uint256 internal constant CONTRACT_BALANCE = 0x8000000000000000000000000000000000000000000000000000000000000000
```


### MSG_SENDER
used to signal that the recipient of an action should be the msgSender


```solidity
address internal constant MSG_SENDER = address(1)
```


### ADDRESS_THIS
used to signal that the recipient of an action should be the address(this)


```solidity
address internal constant ADDRESS_THIS = address(2)
```


