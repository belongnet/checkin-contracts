# IAllowanceTransfer
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/lib/permit2/src/interfaces/IAllowanceTransfer.sol)

**Inherits:**
[IEIP712](/contracts/v2/external/@pancakeswap/infinity-periphery/lib/permit2/src/interfaces/IEIP712.sol/interface.IEIP712.md)

**Title:**
AllowanceTransfer

Handles ERC20 token permissions through signature based allowance setting and ERC20 token transfers by checking allowed amounts

Requires user's token approval on the Permit2 contract


## Functions
### allowance

A mapping from owner address to token address to spender address to PackedAllowance struct, which contains details and conditions of the approval.

The mapping is indexed in the above order see: allowance[ownerAddress][tokenAddress][spenderAddress]

The packed slot holds the allowed amount, expiration at which the allowed amount is no longer valid, and current nonce thats updated on any signature based approvals.


```solidity
function allowance(address user, address token, address spender)
    external
    view
    returns (uint160 amount, uint48 expiration, uint48 nonce);
```

### approve

Approves the spender to use up to amount of the specified token up until the expiration

The packed allowance also holds a nonce, which will stay unchanged in approve

Setting amount to type(uint160).max sets an unlimited approval


```solidity
function approve(address token, address spender, uint160 amount, uint48 expiration) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The token to approve|
|`spender`|`address`|The spender address to approve|
|`amount`|`uint160`|The approved amount of the token|
|`expiration`|`uint48`|The timestamp at which the approval is no longer valid|


### permit

Permit a spender to a given amount of the owners token via the owner's EIP-712 signature

May fail if the owner's nonce was invalidated in-flight by invalidateNonce


```solidity
function permit(address owner, PermitSingle memory permitSingle, bytes calldata signature) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`owner`|`address`|The owner of the tokens being approved|
|`permitSingle`|`PermitSingle`|Data signed over by the owner specifying the terms of approval|
|`signature`|`bytes`|The owner's signature over the permit data|


### permit

Permit a spender to the signed amounts of the owners tokens via the owner's EIP-712 signature

May fail if the owner's nonce was invalidated in-flight by invalidateNonce


```solidity
function permit(address owner, PermitBatch memory permitBatch, bytes calldata signature) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`owner`|`address`|The owner of the tokens being approved|
|`permitBatch`|`PermitBatch`|Data signed over by the owner specifying the terms of approval|
|`signature`|`bytes`|The owner's signature over the permit data|


### transferFrom

Transfer approved tokens from one address to another

Requires the from address to have approved at least the desired amount
of tokens to msg.sender.


```solidity
function transferFrom(address from, address to, uint160 amount, address token) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`from`|`address`|The address to transfer from|
|`to`|`address`|The address of the recipient|
|`amount`|`uint160`|The amount of the token to transfer|
|`token`|`address`|The token address to transfer|


### transferFrom

Transfer approved tokens in a batch

Requires the from addresses to have approved at least the desired amount
of tokens to msg.sender.


```solidity
function transferFrom(AllowanceTransferDetails[] calldata transferDetails) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`transferDetails`|`AllowanceTransferDetails[]`|Array of owners, recipients, amounts, and tokens for the transfers|


### lockdown

Enables performing a "lockdown" of the sender's Permit2 identity
by batch revoking approvals


```solidity
function lockdown(TokenSpenderPair[] calldata approvals) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`approvals`|`TokenSpenderPair[]`|Array of approvals to revoke.|


### invalidateNonces

Invalidate nonces for a given (token, spender) pair

Can't invalidate more than 2**16 nonces per transaction.


```solidity
function invalidateNonces(address token, address spender, uint48 newNonce) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The token to invalidate nonces for|
|`spender`|`address`|The spender to invalidate nonces for|
|`newNonce`|`uint48`|The new nonce to set. Invalidates all nonces less than it.|


## Events
### NonceInvalidation
Emits an event when the owner successfully invalidates an ordered nonce.


```solidity
event NonceInvalidation(
    address indexed owner, address indexed token, address indexed spender, uint48 newNonce, uint48 oldNonce
);
```

### Approval
Emits an event when the owner successfully sets permissions on a token for the spender.


```solidity
event Approval(
    address indexed owner, address indexed token, address indexed spender, uint160 amount, uint48 expiration
);
```

### Permit
Emits an event when the owner successfully sets permissions using a permit signature on a token for the spender.


```solidity
event Permit(
    address indexed owner,
    address indexed token,
    address indexed spender,
    uint160 amount,
    uint48 expiration,
    uint48 nonce
);
```

### Lockdown
Emits an event when the owner sets the allowance back to 0 with the lockdown function.


```solidity
event Lockdown(address indexed owner, address token, address spender);
```

## Errors
### AllowanceExpired
Thrown when an allowance on a token has expired.


```solidity
error AllowanceExpired(uint256 deadline);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`deadline`|`uint256`|The timestamp at which the allowed amount is no longer valid|

### InsufficientAllowance
Thrown when an allowance on a token has been depleted.


```solidity
error InsufficientAllowance(uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`amount`|`uint256`|The maximum amount allowed|

### ExcessiveInvalidation
Thrown when too many nonces are invalidated.


```solidity
error ExcessiveInvalidation();
```

## Structs
### PermitDetails
The permit data for a token


```solidity
struct PermitDetails {
    // ERC20 token address
    address token;
    // the maximum amount allowed to spend
    uint160 amount;
    // timestamp at which a spender's token allowances become invalid
    uint48 expiration;
    // an incrementing value indexed per owner,token,and spender for each signature
    uint48 nonce;
}
```

### PermitSingle
The permit message signed for a single token allownce


```solidity
struct PermitSingle {
    // the permit data for a single token alownce
    PermitDetails details;
    // address permissioned on the allowed tokens
    address spender;
    // deadline on the permit signature
    uint256 sigDeadline;
}
```

### PermitBatch
The permit message signed for multiple token allowances


```solidity
struct PermitBatch {
    // the permit data for multiple token allowances
    PermitDetails[] details;
    // address permissioned on the allowed tokens
    address spender;
    // deadline on the permit signature
    uint256 sigDeadline;
}
```

### PackedAllowance
The saved permissions

This info is saved per owner, per token, per spender and all signed over in the permit message

Setting amount to type(uint160).max sets an unlimited approval


```solidity
struct PackedAllowance {
    // amount allowed
    uint160 amount;
    // permission expiry
    uint48 expiration;
    // an incrementing value indexed per owner,token,and spender for each signature
    uint48 nonce;
}
```

### TokenSpenderPair
A token spender pair.


```solidity
struct TokenSpenderPair {
    // the token the spender is approved
    address token;
    // the spender address
    address spender;
}
```

### AllowanceTransferDetails
Details for a token transfer.


```solidity
struct AllowanceTransferDetails {
    // the owner of the token
    address from;
    // the recipient of the token
    address to;
    // the amount of the token
    uint160 amount;
    // the token to be transferred
    address token;
}
```

