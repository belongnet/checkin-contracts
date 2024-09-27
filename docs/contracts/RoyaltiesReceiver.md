# Solidity API

## ZeroAddressPasted

```solidity
error ZeroAddressPasted()
```

Thrown when a zero address is provided where it's not allowed.

## ZeroSharesPasted

```solidity
error ZeroSharesPasted()
```

Thrown when zero shares are provided for a payee.

## ArraysLengthMismatch

```solidity
error ArraysLengthMismatch()
```

Thrown when the lengths of payees and shares arrays do not match.

## Only2Payees

```solidity
error Only2Payees()
```

Thrown when more than two payees are provided.

## AccountNotDuePayment

```solidity
error AccountNotDuePayment()
```

Thrown when an account is not due for payment.

## AccountHasSharesAlready

```solidity
error AccountHasSharesAlready()
```

Thrown when an account already has shares.

## DvisonByZero

```solidity
error DvisonByZero()
```

Thrown when a division by zero is attempted.

## IncorrectPayeeIndex

```solidity
error IncorrectPayeeIndex(uint256 incorrectIndex)
```

Thrown when an incorrect payee index is provided.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| incorrectIndex | uint256 | The incorrect index value provided. |

## Releases

Struct for tracking total released amounts and account-specific released amounts.

```solidity
struct Releases {
  uint256 totalReleased;
  mapping(address => uint256) released;
}
```

## SharesAdded

Struct for managing total shares and individual account shares.

```solidity
struct SharesAdded {
  uint256 totalShares;
  mapping(address => uint256) shares;
}
```

## RoyaltiesReceiver

A contract for managing and releasing royalty payments in both native Ether and ERC20 tokens.

_Handles payment distribution based on shares assigned to payees.
Fork of OZ's PaymentSplitter with some changes. The only change is that common `release()`
functions are replaced with `releaseAll()` functions which allow the caller to transfer funds
for only both the creator and the platform._

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
event PaymentReleased(address to, uint256 amount)
```

Emitted when a payment in native Ether is released.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The address receiving the payment. |
| amount | uint256 | The amount of Ether released. |

### ERC20PaymentReleased

```solidity
event ERC20PaymentReleased(address token, address to, uint256 amount)
```

Emitted when a payment in ERC20 tokens is released.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the ERC20 token. |
| to | address | The address receiving the payment. |
| amount | uint256 | The amount of tokens released. |

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

### MAX_PAYEES_LENGTH

```solidity
uint256 MAX_PAYEES_LENGTH
```

Maximum number of payees allowed.

### payees

```solidity
address[] payees
```

List of payee addresses.

### sharesAdded

```solidity
struct SharesAdded sharesAdded
```

Struct storing payee shares and total shares.

### nativeReleases

```solidity
struct Releases nativeReleases
```

Struct for tracking native Ether releases.

### erc20Releases

```solidity
mapping(address => struct Releases) erc20Releases
```

Mapping of ERC20 token addresses to their respective release tracking structs.

### constructor

```solidity
constructor(address[] payees_, uint256[] shares_) public payable
```

_Initializes the contract with a list of payees and their respective shares._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| payees_ | address[] | The list of payee addresses. |
| shares_ | uint256[] | The list of shares corresponding to each payee. |

### receive

```solidity
receive() external payable
```

_Logs the receipt of Ether. Called when the contract receives Ether._

### releaseAll

```solidity
function releaseAll() external
```

Releases all pending native Ether payments to the payees.

### releaseAll

```solidity
function releaseAll(address token) external
```

Releases all pending ERC20 payments for a given token to the payees.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the ERC20 token to be released. |

### totalShares

```solidity
function totalShares() public view returns (uint256)
```

Returns the total number of shares assigned to all payees.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total shares. |

### shares

```solidity
function shares(address account) external view returns (uint256)
```

Returns the number of shares held by a specific payee.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the payee. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of shares held by the payee. |

### totalReleased

```solidity
function totalReleased() public view returns (uint256)
```

Returns the total amount of native Ether already released to payees.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total amount of Ether released. |

### totalReleased

```solidity
function totalReleased(address token) public view returns (uint256)
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
function released(address account) public view returns (uint256)
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
function released(address token, address account) public view returns (uint256)
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

### payee

```solidity
function payee(uint256 index) external view returns (address)
```

Returns the address of the payee at the given index.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | The index of the payee. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the payee. |

### _releaseNative

```solidity
function _releaseNative(address account) internal
```

_Releases pending native Ether to a payee._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the payee. |

### _releaseERC20

```solidity
function _releaseERC20(address token, address account) internal
```

_Releases pending ERC20 tokens to a payee._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the ERC20 token. |
| account | address | The address of the payee. |

