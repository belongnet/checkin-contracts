# ISignatureTransfer
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/lib/permit2/src/interfaces/ISignatureTransfer.sol)

**Inherits:**
[IEIP712](/contracts/v2/external/@pancakeswap/infinity-periphery/lib/permit2/src/interfaces/IEIP712.sol/interface.IEIP712.md)

**Title:**
SignatureTransfer

Handles ERC20 token transfers through signature based actions

Requires user's token approval on the Permit2 contract


## Functions
### nonceBitmap

A map from token owner address and a caller specified word index to a bitmap. Used to set bits in the bitmap to prevent against signature replay protection

Uses unordered nonces so that permit messages do not need to be spent in a certain order

The mapping is indexed first by the token owner, then by an index specified in the nonce

It returns a uint256 bitmap

The index, or wordPosition is capped at type(uint248).max


```solidity
function nonceBitmap(address, uint256) external view returns (uint256);
```

### permitTransferFrom

Transfers a token using a signed permit message

Reverts if the requested amount is greater than the permitted signed amount


```solidity
function permitTransferFrom(
    PermitTransferFrom memory permit,
    SignatureTransferDetails calldata transferDetails,
    address owner,
    bytes calldata signature
) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`permit`|`PermitTransferFrom`|The permit data signed over by the owner|
|`transferDetails`|`SignatureTransferDetails`|The spender's requested transfer details for the permitted token|
|`owner`|`address`|The owner of the tokens to transfer|
|`signature`|`bytes`|The signature to verify|


### permitWitnessTransferFrom

Transfers a token using a signed permit message

Includes extra data provided by the caller to verify signature over

The witness type string must follow EIP712 ordering of nested structs and must include the TokenPermissions type definition

Reverts if the requested amount is greater than the permitted signed amount


```solidity
function permitWitnessTransferFrom(
    PermitTransferFrom memory permit,
    SignatureTransferDetails calldata transferDetails,
    address owner,
    bytes32 witness,
    string calldata witnessTypeString,
    bytes calldata signature
) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`permit`|`PermitTransferFrom`|The permit data signed over by the owner|
|`transferDetails`|`SignatureTransferDetails`|The spender's requested transfer details for the permitted token|
|`owner`|`address`|The owner of the tokens to transfer|
|`witness`|`bytes32`|Extra data to include when checking the user signature|
|`witnessTypeString`|`string`|The EIP-712 type definition for remaining string stub of the typehash|
|`signature`|`bytes`|The signature to verify|


### permitTransferFrom

Transfers multiple tokens using a signed permit message


```solidity
function permitTransferFrom(
    PermitBatchTransferFrom memory permit,
    SignatureTransferDetails[] calldata transferDetails,
    address owner,
    bytes calldata signature
) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`permit`|`PermitBatchTransferFrom`|The permit data signed over by the owner|
|`transferDetails`|`SignatureTransferDetails[]`|Specifies the recipient and requested amount for the token transfer|
|`owner`|`address`|The owner of the tokens to transfer|
|`signature`|`bytes`|The signature to verify|


### permitWitnessTransferFrom

Transfers multiple tokens using a signed permit message

Includes extra data provided by the caller to verify signature over

The witness type string must follow EIP712 ordering of nested structs and must include the TokenPermissions type definition


```solidity
function permitWitnessTransferFrom(
    PermitBatchTransferFrom memory permit,
    SignatureTransferDetails[] calldata transferDetails,
    address owner,
    bytes32 witness,
    string calldata witnessTypeString,
    bytes calldata signature
) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`permit`|`PermitBatchTransferFrom`|The permit data signed over by the owner|
|`transferDetails`|`SignatureTransferDetails[]`|Specifies the recipient and requested amount for the token transfer|
|`owner`|`address`|The owner of the tokens to transfer|
|`witness`|`bytes32`|Extra data to include when checking the user signature|
|`witnessTypeString`|`string`|The EIP-712 type definition for remaining string stub of the typehash|
|`signature`|`bytes`|The signature to verify|


### invalidateUnorderedNonces

Invalidates the bits specified in mask for the bitmap at the word position

The wordPos is maxed at type(uint248).max


```solidity
function invalidateUnorderedNonces(uint256 wordPos, uint256 mask) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`wordPos`|`uint256`|A number to index the nonceBitmap at|
|`mask`|`uint256`|A bitmap masked against msg.sender's current bitmap at the word position|


## Events
### UnorderedNonceInvalidation
Emits an event when the owner successfully invalidates an unordered nonce.


```solidity
event UnorderedNonceInvalidation(address indexed owner, uint256 word, uint256 mask);
```

## Errors
### InvalidAmount
Thrown when the requested amount for a transfer is larger than the permissioned amount


```solidity
error InvalidAmount(uint256 maxAmount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`maxAmount`|`uint256`|The maximum amount a spender can request to transfer|

### LengthMismatch
Thrown when the number of tokens permissioned to a spender does not match the number of tokens being transferred

If the spender does not need to transfer the number of tokens permitted, the spender can request amount 0 to be transferred


```solidity
error LengthMismatch();
```

## Structs
### TokenPermissions
The token and amount details for a transfer signed in the permit transfer signature


```solidity
struct TokenPermissions {
    // ERC20 token address
    address token;
    // the maximum amount that can be spent
    uint256 amount;
}
```

### PermitTransferFrom
The signed permit message for a single token transfer


```solidity
struct PermitTransferFrom {
    TokenPermissions permitted;
    // a unique value for every token owner's signature to prevent signature replays
    uint256 nonce;
    // deadline on the permit signature
    uint256 deadline;
}
```

### SignatureTransferDetails
Specifies the recipient address and amount for batched transfers.

Recipients and amounts correspond to the index of the signed token permissions array.

Reverts if the requested amount is greater than the permitted signed amount.


```solidity
struct SignatureTransferDetails {
    // recipient address
    address to;
    // spender requested amount
    uint256 requestedAmount;
}
```

### PermitBatchTransferFrom
Used to reconstruct the signed permit message for multiple token transfers

Do not need to pass in spender address as it is required that it is msg.sender

Note that a user still signs over a spender address


```solidity
struct PermitBatchTransferFrom {
    // the tokens and corresponding amounts permitted for a transfer
    TokenPermissions[] permitted;
    // a unique value for every token owner's signature to prevent signature replays
    uint256 nonce;
    // deadline on the permit signature
    uint256 deadline;
}
```

