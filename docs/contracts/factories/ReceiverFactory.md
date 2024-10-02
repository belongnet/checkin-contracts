# Solidity API

## ReceiverFactory

A factory contract for creating instances of the RoyaltiesReceiver contract

_This contract deploys new instances of RoyaltiesReceiver and assigns payees and shares_

### ReceiverCreated

```solidity
event ReceiverCreated(address creator, contract RoyaltiesReceiver royaltiesReceiver, address[2] payees, uint128[2] shares)
```

Emitted when a new RoyaltiesReceiver contract is created

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| creator | address | The address that deployed the new receiver |
| royaltiesReceiver | contract RoyaltiesReceiver | The address of the newly created RoyaltiesReceiver contract |
| payees | address[2] | The list of payees in the RoyaltiesReceiver |
| shares | uint128[2] | The list of shares corresponding to each payee |

### deployReceiver

```solidity
function deployReceiver(address[2] payees, uint128[2] shares) external returns (contract RoyaltiesReceiver royaltiesReceiver)
```

Deploys a new RoyaltiesReceiver contract

_Creates an instance of `RoyaltiesReceiver` where each account in `payees` is assigned the number of shares
at the corresponding position in the `shares` array.

Requirements:
- All addresses in `payees` must be non-zero.
- Both arrays (`payees` and `shares`) must have the same non-zero length.
- There must be no duplicate addresses in `payees`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| payees | address[2] | The array of addresses to receive royalties |
| shares | uint128[2] | The array of shares corresponding to each payee |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| royaltiesReceiver | contract RoyaltiesReceiver | The address of the newly deployed RoyaltiesReceiver contract |

