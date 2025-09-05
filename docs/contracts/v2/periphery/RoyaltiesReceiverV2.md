# Solidity API

## RoyaltiesReceiverV2

Manages and releases royalty payments in native NativeCurrency and ERC20 tokens.

_Fork of OZ PaymentSplitter with changes: common `release()` variants are replaced with
     `releaseAll()` functions to release funds for creator, platform and optional referral in one call._

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

Emitted when a payment is released in native NativeCurrency or an ERC20 token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The ERC20 token address, or `NATIVE_CURRENCY_ADDRESS` for native currency. |
| to | address | The address receiving the payment. |
| amount | uint256 | The amount released. |

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

### NATIVE_CURRENCY_ADDRESS

```solidity
address NATIVE_CURRENCY_ADDRESS
```

The constant address representing NativeCurrency.

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

Initializes the contract with payees and a Factory reference.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _royaltiesReceivers | struct RoyaltiesReceiverV2.RoyaltiesReceivers | Payee addresses for creator, platform and optional referral. |
| _factory | contract Factory | Factory instance to read royalties parameters and referrals. |
| referralCode_ | bytes32 | Referral code associated with this receiver. |

### shares

```solidity
function shares(address account) public view returns (uint256)
```

Returns shares (in BPS, out of TOTAL_SHARES) for a given account.

_Platform share may be reduced by a referral share if a referral payee is set._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account to query (creator, platform or referral). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The share assigned to the account in BPS (out of TOTAL_SHARES). |

### receive

```solidity
receive() external payable
```

Logs the receipt of NativeCurrency. Triggered on plain NativeCurrency transfers.

### releaseAll

```solidity
function releaseAll(address token) external
```

Releases all pending payments for a currency to the payees.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The currency to release: ERC20 token address or `NATIVE_CURRENCY_ADDRESS` for native NativeCurrency. |

### release

```solidity
function release(address token, address to) external
```

Releases pending payments for a currency to a specific payee.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The currency to release: ERC20 token address or `NATIVE_CURRENCY_ADDRESS` for native NativeCurrency. |
| to | address | The payee address to release to. |

### totalReleased

```solidity
function totalReleased(address token) external view returns (uint256)
```

Returns the total amount of a currency already released to payees.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The currency queried: ERC20 token address or `NATIVE_CURRENCY_ADDRESS` for native NativeCurrency. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total amount released. |

### released

```solidity
function released(address token, address account) external view returns (uint256)
```

Returns the amount of a specific currency already released to a specific payee.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The currency queried: ERC20 token address or `NATIVE_CURRENCY_ADDRESS` for native NativeCurrency. |
| account | address | The address of the payee. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The amount of tokens released to the payee. |

