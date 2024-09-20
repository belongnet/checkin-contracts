# Solidity API

## AutoValidatorTransferApprove

Base contract mix-in that provides functionality to automatically approve a 721-C transfer validator implementation for transfers.

_This contract allows the contract owner to set an automatic approval flag for transfer validators._

### AutomaticApprovalOfTransferValidatorSet

```solidity
event AutomaticApprovalOfTransferValidatorSet(bool autoApproved)
```

Emitted when the automatic approval flag is modified by the creator.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| autoApproved | bool | The new value of the automatic approval flag. |

### autoApproveTransfersFromValidator

```solidity
bool autoApproveTransfersFromValidator
```

If true, the collection's transfer validator is automatically approved to transfer token holders' tokens.

### _setAutomaticApprovalOfTransfersFromValidator

```solidity
function _setAutomaticApprovalOfTransfersFromValidator(bool autoApprove) internal
```

Sets whether the transfer validator is automatically approved as an operator for all token owners.

_This function can only be called by the contract owner and modifies the automatic approval flag._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| autoApprove | bool | If true, the collection's transfer validator will be automatically approved to transfer token holders' tokens. |

