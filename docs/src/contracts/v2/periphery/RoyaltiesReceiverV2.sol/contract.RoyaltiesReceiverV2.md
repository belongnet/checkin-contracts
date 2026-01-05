# RoyaltiesReceiverV2
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/periphery/RoyaltiesReceiverV2.sol)

**Inherits:**
Initializable

**Title:**
RoyaltiesReceiverV2

Manages and releases royalty payments in native NativeCurrency and ERC20 tokens.

Fork of OZ PaymentSplitter with changes: common `release()` variants are replaced with
`releaseAll()` functions to release funds for creator, platform and optional referral in one call.


## State Variables
### NATIVE_CURRENCY_ADDRESS
The constant address representing NativeCurrency.


```solidity
address public constant NATIVE_CURRENCY_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
```


### TOTAL_SHARES
Total shares amount.


```solidity
uint256 public constant TOTAL_SHARES = 10000
```


### factory

```solidity
Factory public factory
```


### referralCode

```solidity
bytes32 public referralCode
```


### royaltiesReceivers
List of payee addresses. Returns the address of the payee at the given index.


```solidity
RoyaltiesReceivers public royaltiesReceivers
```


### nativeReleases
Struct for tracking native Ether releases.


```solidity
Releases private nativeReleases
```


### erc20Releases
Mapping of ERC20 token addresses to their respective release tracking structs.


```solidity
mapping(address => Releases) private erc20Releases
```


## Functions
### constructor

**Note:**
oz-upgrades-unsafe-allow: constructor


```solidity
constructor() ;
```

### initialize

Initializes the contract with payees and a Factory reference.


```solidity
function initialize(RoyaltiesReceivers calldata _royaltiesReceivers, Factory _factory, bytes32 referralCode_)
    external
    initializer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_royaltiesReceivers`|`RoyaltiesReceivers`|Payee addresses for creator, platform and optional referral.|
|`_factory`|`Factory`|Factory instance to read royalties parameters and referrals.|
|`referralCode_`|`bytes32`|Referral code associated with this receiver.|


### shares

Returns shares (in BPS, out of TOTAL_SHARES) for a given account.

Platform share may be reduced by a referral share if a referral payee is set.


```solidity
function shares(address account) public view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`account`|`address`|The account to query (creator, platform or referral).|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The share assigned to the account in BPS (out of TOTAL_SHARES).|


### receive

Logs the receipt of NativeCurrency. Triggered on plain NativeCurrency transfers.


```solidity
receive() external payable;
```

### releaseAll

Releases all pending payments for a currency to the payees.


```solidity
function releaseAll(address token) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The currency to release: ERC20 token address or `NATIVE_CURRENCY_ADDRESS` for native NativeCurrency.|


### totalReleased

Returns the total amount of a currency already released to payees.


```solidity
function totalReleased(address token) external view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The currency queried: ERC20 token address or `NATIVE_CURRENCY_ADDRESS` for native NativeCurrency.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The total amount released.|


### released

Returns the amount of a specific currency already released to a specific payee.


```solidity
function released(address token, address account) external view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The currency queried: ERC20 token address or `NATIVE_CURRENCY_ADDRESS` for native NativeCurrency.|
|`account`|`address`|The address of the payee.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The amount of tokens released to the payee.|


### _release

Internal function to release the pending payment for a payee.


```solidity
function _release(address token, address account) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The ERC20 token address, or `NATIVE_CURRENCY_ADDRESS` for native NativeCurrency.|
|`account`|`address`|The payee's address receiving the payment.|


### _pendingPayment

Computes the pending payment for an account in a given currency.


```solidity
function _pendingPayment(bool isNativeRelease, address token, address account) private view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`isNativeRelease`|`bool`|True if the currency is native NativeCurrency, false for ERC20.|
|`token`|`address`|The ERC20 token address or `NATIVE_CURRENCY_ADDRESS` for native NativeCurrency.|
|`account`|`address`|The payee to compute pending payment for.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The amount of funds still owed to the payee.|


### _onlyToPayee

Reverts unless `account` is one of the configured payees.


```solidity
function _onlyToPayee(address account) private view;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`account`|`address`|The account to validate as a payee.|


## Events
### PayeeAdded
Emitted when a new payee is added to the contract.


```solidity
event PayeeAdded(address indexed account, uint256 shares);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`account`|`address`|The address of the new payee.|
|`shares`|`uint256`|The number of shares assigned to the payee.|

### PaymentReleased
Emitted when a payment is released in native NativeCurrency or an ERC20 token.


```solidity
event PaymentReleased(address indexed token, address indexed to, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The ERC20 token address, or `NATIVE_CURRENCY_ADDRESS` for native currency.|
|`to`|`address`|The address receiving the payment.|
|`amount`|`uint256`|The amount released.|

### PaymentReceived
Emitted when the contract receives native Ether.


```solidity
event PaymentReceived(address indexed from, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`from`|`address`|The address sending the Ether.|
|`amount`|`uint256`|The amount of Ether received.|

## Errors
### AccountNotDuePayment
Thrown when an account is not due for payment.


```solidity
error AccountNotDuePayment(address account);
```

### OnlyToPayee
Thrown when transfer is not to a payee.


```solidity
error OnlyToPayee();
```

## Structs
### Releases
Struct for tracking total released amounts and account-specific released amounts.


```solidity
struct Releases {
    /// @notice The total amount of funds released from the contract.
    uint256 totalReleased;
    /// @notice A mapping to track the released amount per payee account.
    mapping(address => uint256) released;
}
```

### RoyaltiesReceivers
**Title:**
RoyaltiesReceivers

Payee addresses for royalty splits

Used by RoyaltiesReceiver to distribute payments


```solidity
struct RoyaltiesReceivers {
    /// @notice Address receiving creator share
    address creator;
    /// @notice Address receiving platform share
    address platform;
    /// @notice Address receiving referral share (optional)
    address referral;
}
```

