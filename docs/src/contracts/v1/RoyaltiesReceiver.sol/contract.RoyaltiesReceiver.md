# RoyaltiesReceiver
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v1/RoyaltiesReceiver.sol)

**Title:**
RoyaltiesReceiver

A contract for managing and releasing royalty payments in both native Ether and ERC20 tokens.

Handles payment distribution based on shares assigned to payees. Fork of OZ's PaymentSplitter with some changes.
The only change is that common `release()` functions are replaced with `releaseAll()` functions,
which allow the caller to transfer funds for both the creator and the platform.


## State Variables
### ARRAY_SIZE
Maximum array size used.


```solidity
uint256 private constant ARRAY_SIZE = 3
```


### TOTAL_SHARES
Total shares amount.


```solidity
uint256 public constant TOTAL_SHARES = 10000
```


### AMOUNT_TO_CREATOR
Amount goes to creator.


```solidity
uint16 private constant AMOUNT_TO_CREATOR = 8000
```


### AMOUNT_TO_PLATFORM
Amount goes to platform.


```solidity
uint16 private constant AMOUNT_TO_PLATFORM = 2000
```


### payees
List of payee addresses. Returns the address of the payee at the given index.


```solidity
address[ARRAY_SIZE] public payees
```


### shares
Returns the number of shares held by a specific payee.


```solidity
mapping(address => uint256) public shares
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

Initializes the contract with a list of payees and their respective shares.


```solidity
constructor(bytes32 referralCode, address[ARRAY_SIZE] memory payees_) ;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`referralCode`|`bytes32`|The referral code associated with this NFT instance.|
|`payees_`|`address[ARRAY_SIZE]`|The list of payee addresses.|


### receive

Logs the receipt of Ether. Called when the contract receives Ether.


```solidity
receive() external payable;
```

### releaseAll

Releases all pending native Ether payments to the payees.


```solidity
function releaseAll() external;
```

### releaseAll

Releases all pending ERC20 token payments for a given token to the payees.


```solidity
function releaseAll(address token) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The address of the ERC20 token to be released.|


### release

Releases pending native Ether payments to the payee.


```solidity
function release(address to) external;
```

### release

Releases pending ERC20 token payments for a given token to the payee.


```solidity
function release(address token, address to) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The address of the ERC20 token to be released.|
|`to`|`address`||


### totalReleased

Returns the total amount of native Ether already released to payees.


```solidity
function totalReleased() external view returns (uint256);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The total amount of Ether released.|


### totalReleased

Returns the total amount of a specific ERC20 token already released to payees.


```solidity
function totalReleased(address token) external view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The address of the ERC20 token.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The total amount of tokens released.|


### released

Returns the amount of native Ether already released to a specific payee.


```solidity
function released(address account) external view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`account`|`address`|The address of the payee.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The amount of Ether released to the payee.|


### released

Returns the amount of a specific ERC20 token already released to a specific payee.


```solidity
function released(address token, address account) external view returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The address of the ERC20 token.|
|`account`|`address`|The address of the payee.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`uint256`|The amount of tokens released to the payee.|


### _release

Internal function to release the pending payment for a payee.


```solidity
function _release(address token, address account) internal;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The ERC20 token address, or address(0) for native Ether.|
|`account`|`address`|The payee's address receiving the payment.|


### _pendingPayment

Internal logic for computing the pending payment for an account.


```solidity
function _pendingPayment(address account, uint256 totalReceived, uint256 alreadyReleased)
    private
    view
    returns (uint256);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`account`|`address`|The address of the payee.|
|`totalReceived`|`uint256`|The total amount of funds received by the contract.|
|`alreadyReleased`|`uint256`|The amount already released to the payee.|

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


### _payeesInfo

Returns the current payees array and its effective size (2 without referral, 3 with referral).


```solidity
function _payeesInfo() private view returns (uint256 arraySize, address[ARRAY_SIZE] memory _payees);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`arraySize`|`uint256`|Effective number of payees (2 or 3).|
|`_payees`|`address[ARRAY_SIZE]`|In-memory array of payees.|


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
Emitted when a payment in native Ether is released.


```solidity
event PaymentReleased(address indexed token, address indexed to, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The address of the ERC20 token if address(0) then native currency.|
|`to`|`address`|The address receiving the payment.|
|`amount`|`uint256`|The amount of Ether released.|

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

