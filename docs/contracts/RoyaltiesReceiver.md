# Solidity API

## ZeroAddressPassed

```solidity
error ZeroAddressPassed()
```

Thrown when a zero address is provided where it's not allowed.

## ZeroSharesPasted

```solidity
error ZeroSharesPasted()
```

Thrown when zero shares are provided for a payee.

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

## DivisionByZero

```solidity
error DivisionByZero()
```

Thrown when a division by zero is attempted.

## ThirdPayeeExists

```solidity
error ThirdPayeeExists()
```

Thrown when a third payee already exists.

## ThirdPayeeCanBeAddedOnlyByPayees

```solidity
error ThirdPayeeCanBeAddedOnlyByPayees()
```

Thrown when only payees can add a third payee.

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

### ARRAY_SIZE

```solidity
uint256 ARRAY_SIZE
```

Maximum array size used.

### payees

```solidity
address[3] payees
```

List of payee addresses. Returns the address of the payee at the given index.

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
constructor(address[2] payees_, uint128[2] shares_) public payable
```

Initializes the contract with a list of payees and their respective shares.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| payees_ | address[2] | The list of payee addresses. |
| shares_ | uint128[2] | The list of shares corresponding to each payee. |

### receive

```solidity
receive() external payable
```

Logs the receipt of Ether. Called when the contract receives Ether.

### addThirdPayee

```solidity
function addThirdPayee(address payee_, uint128 shares_) external
```

Adds a third payee to the contract, if not already present.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| payee_ | address | The address of the new payee. |
| shares_ | uint128 | The number of shares assigned to the new payee. |

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

