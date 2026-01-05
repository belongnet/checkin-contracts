# MockTransferValidatorV2
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/mocks/MockTransferValidator.sol)

**Title:**
MockTransferValidatorV2

Minimal mock exposing `validateTransfer` without token-type setter.


## State Variables
### switcher

```solidity
bool internal switcher
```


## Functions
### constructor


```solidity
constructor(bool _switcher) ;
```

### setSwitcher

Toggles the validator on/off behavior.


```solidity
function setSwitcher(bool _switcher) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_switcher`|`bool`|True to allow transfers; false to revert.|


### validateTransfer

Validates a transfer; reverts when `switcher` is false.


```solidity
function validateTransfer(
    address,
    /* caller */
    address,
    /* from */
    address,
    /* to */
    uint256 /* tokenId */
)
    external
    view;
```

