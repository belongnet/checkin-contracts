# Solidity API

## RoyaltiesReceiverV2

A contract for managing and releasing royalty payments in both native Ether and ERC20 tokens.

_Handles payment distribution based on shares assigned to payees. Fork of OZ's PaymentSplitter with some changes.
The only change is that common `release()` functions are replaced with `releaseAll()` functions,
which allow the caller to transfer funds for both the creator and the platform._

### AccountNotDuePayment

```solidity
error AccountNotDuePayment(address account)
```

Thrown when an account is not due for payment.

### OnlyToPayee

```solidity
error OnlyToPayee()
```

Thrown when transfer is not to a payee.

### PayeeAdded

```solidity
event PayeeAdded(address account, uint256 shares)
```

Emitted when a new payee is added to the contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the new payee. |
| shares | uint256 | The number of shares assigned to the payee. |

### PaymentReleased

```solidity
event PaymentReleased(address token, address to, uint256 amount)
```

Emitted when a payment in native Ether is released.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the ERC20 token if address(0) then native currency. |
| to | address | The address receiving the payment. |
| amount | uint256 | The amount of Ether released. |

### PaymentReceived

```solidity
event PaymentReceived(address from, uint256 amount)
```

Emitted when the contract receives native Ether.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The address sending the Ether. |
| amount | uint256 | The amount of Ether received. |

### Releases

Struct for tracking total released amounts and account-specific released amounts.

```solidity
struct Releases {
  uint256 totalReleased;
  mapping(address => uint256) released;
}
```

### RoyaltiesReceivers

Payee addresses for royalty splits

_Used by RoyaltiesReceiver to distribute payments_

```solidity
struct RoyaltiesReceivers {
  address creator;
  address platform;
  address referral;
}
```

### ETH_ADDRESS

```solidity
address ETH_ADDRESS
```

The constant address representing ETH.

### TOTAL_SHARES

```solidity
uint256 TOTAL_SHARES
```

Total shares amount.

### factory

```solidity
contract Factory factory
```

### referralCode

```solidity
bytes32 referralCode
```

### royaltiesReceivers

```solidity
struct RoyaltiesReceiverV2.RoyaltiesReceivers royaltiesReceivers
```

List of payee addresses. Returns the address of the payee at the given index.

### initialize

```solidity
function initialize(struct RoyaltiesReceiverV2.RoyaltiesReceivers _royaltiesReceivers, contract Factory _factory, bytes32 referralCode_) external
```

Initializes the contract with a list of payees and their respective shares.

### shares

```solidity
function shares(address account) public view returns (uint256)
```

### receive

```solidity
receive() external payable
```

Logs the receipt of Ether. Called when the contract receives Ether.

### releaseAll

```solidity
function releaseAll(address token) external
```

Releases all pending payments for a given currency to the payees.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the currecny to be released (ERC20 token address or address(0) for native Ether). |

### release

```solidity
function release(address token, address to) external
```

Releases pending ERC20 token payments for a given token to the payee.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the currecny to be released (ERC20 token address or address(0) for native Ether). |
| to | address |  |

### totalReleased

```solidity
function totalReleased(address token) external view returns (uint256)
```

Returns the total amount of a specific currency already released to payees.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the currecny to be released (ERC20 token address or address(0) for native Ether). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total amount released. |

### released

```solidity
function released(address token, address account) external view returns (uint256)
```

Returns the amount of a specific ERC20 token already released to a specific payee.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the ERC20 token. |
| account | address | The address of the payee. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The amount of tokens released to the payee. |

