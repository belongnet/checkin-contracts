# Solidity API

## AccountNotDuePayment

```solidity
error AccountNotDuePayment(address account)
```

Thrown when an account is not due for payment.

## OnlyToPayee

```solidity
error OnlyToPayee()
```

Thrown when transfer is not to a payee.

## Releases

Struct for tracking total released amounts and account-specific released amounts.

```solidity
struct Releases {
  uint256 totalReleased;
  mapping(address => uint256) released;
}
```

## RoyaltiesReceiver

A contract for managing and releasing royalty payments in both native Ether and ERC20 tokens.

_Handles payment distribution based on shares assigned to payees. Fork of OZ's PaymentSplitter with some changes.
The only change is that common `release()` functions are replaced with `releaseAll()` functions,
which allow the caller to transfer funds for both the creator and the platform._

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

### TOTAL_SHARES

```solidity
uint256 TOTAL_SHARES
```

Total shares amount.

### payees

```solidity
address[3] payees
```

List of payee addresses. Returns the address of the payee at the given index.

### shares

```solidity
mapping(address => uint256) shares
```

Returns the number of shares held by a specific payee.

### constructor

```solidity
constructor(bytes32 referralCode, address[3] payees_) public
```

Initializes the contract with a list of payees and their respective shares.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| referralCode | bytes32 | The referral code associated with this NFT instance. |
| payees_ | address[3] | The list of payee addresses. |

### receive

```solidity
receive() external payable
```

Logs the receipt of Ether. Called when the contract receives Ether.

### releaseAll

```solidity
function releaseAll() external
```

Releases all pending native Ether payments to the payees.

### releaseAll

```solidity
function releaseAll(address token) external
```

Releases all pending ERC20 token payments for a given token to the payees.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the ERC20 token to be released. |

### release

```solidity
function release(address to) external
```

Releases pending native Ether payments to the payee.

### release

```solidity
function release(address token, address to) external
```

Releases pending ERC20 token payments for a given token to the payee.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the ERC20 token to be released. |
| to | address |  |

### totalReleased

```solidity
function totalReleased() external view returns (uint256)
```

Returns the total amount of native Ether already released to payees.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total amount of Ether released. |

### totalReleased

```solidity
function totalReleased(address token) external view returns (uint256)
```

Returns the total amount of a specific ERC20 token already released to payees.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the ERC20 token. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total amount of tokens released. |

### released

```solidity
function released(address account) external view returns (uint256)
```

Returns the amount of native Ether already released to a specific payee.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the payee. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The amount of Ether released to the payee. |

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

### _release

```solidity
function _release(address token, address account) internal
```

_Internal function to release the pending payment for a payee._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The ERC20 token address, or address(0) for native Ether. |
| account | address | The payee's address receiving the payment. |

