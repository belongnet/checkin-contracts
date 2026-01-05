# PermitHash
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/lib/permit2/src/libraries/PermitHash.sol)


## State Variables
### _PERMIT_DETAILS_TYPEHASH

```solidity
bytes32 public constant _PERMIT_DETAILS_TYPEHASH =
    keccak256("PermitDetails(address token,uint160 amount,uint48 expiration,uint48 nonce)")
```


### _PERMIT_SINGLE_TYPEHASH

```solidity
bytes32 public constant _PERMIT_SINGLE_TYPEHASH = keccak256(
    "PermitSingle(PermitDetails details,address spender,uint256 sigDeadline)PermitDetails(address token,uint160 amount,uint48 expiration,uint48 nonce)"
)
```


### _PERMIT_BATCH_TYPEHASH

```solidity
bytes32 public constant _PERMIT_BATCH_TYPEHASH = keccak256(
    "PermitBatch(PermitDetails[] details,address spender,uint256 sigDeadline)PermitDetails(address token,uint160 amount,uint48 expiration,uint48 nonce)"
)
```


### _TOKEN_PERMISSIONS_TYPEHASH

```solidity
bytes32 public constant _TOKEN_PERMISSIONS_TYPEHASH = keccak256("TokenPermissions(address token,uint256 amount)")
```


### _PERMIT_TRANSFER_FROM_TYPEHASH

```solidity
bytes32 public constant _PERMIT_TRANSFER_FROM_TYPEHASH = keccak256(
    "PermitTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline)TokenPermissions(address token,uint256 amount)"
)
```


### _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH

```solidity
bytes32 public constant _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH = keccak256(
    "PermitBatchTransferFrom(TokenPermissions[] permitted,address spender,uint256 nonce,uint256 deadline)TokenPermissions(address token,uint256 amount)"
)
```


### _TOKEN_PERMISSIONS_TYPESTRING

```solidity
string public constant _TOKEN_PERMISSIONS_TYPESTRING = "TokenPermissions(address token,uint256 amount)"
```


### _PERMIT_TRANSFER_FROM_WITNESS_TYPEHASH_STUB

```solidity
string public constant _PERMIT_TRANSFER_FROM_WITNESS_TYPEHASH_STUB =
    "PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,"
```


### _PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPEHASH_STUB

```solidity
string public constant _PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPEHASH_STUB =
    "PermitBatchWitnessTransferFrom(TokenPermissions[] permitted,address spender,uint256 nonce,uint256 deadline,"
```


## Functions
### hash


```solidity
function hash(IAllowanceTransfer.PermitSingle memory permitSingle) internal pure returns (bytes32);
```

### hash


```solidity
function hash(IAllowanceTransfer.PermitBatch memory permitBatch) internal pure returns (bytes32);
```

### hash


```solidity
function hash(ISignatureTransfer.PermitTransferFrom memory permit) internal view returns (bytes32);
```

### hash


```solidity
function hash(ISignatureTransfer.PermitBatchTransferFrom memory permit) internal view returns (bytes32);
```

### hashWithWitness


```solidity
function hashWithWitness(
    ISignatureTransfer.PermitTransferFrom memory permit,
    bytes32 witness,
    string calldata witnessTypeString
) internal view returns (bytes32);
```

### hashWithWitness


```solidity
function hashWithWitness(
    ISignatureTransfer.PermitBatchTransferFrom memory permit,
    bytes32 witness,
    string calldata witnessTypeString
) internal view returns (bytes32);
```

### _hashPermitDetails


```solidity
function _hashPermitDetails(IAllowanceTransfer.PermitDetails memory details) private pure returns (bytes32);
```

### _hashTokenPermissions


```solidity
function _hashTokenPermissions(ISignatureTransfer.TokenPermissions memory permitted)
    private
    pure
    returns (bytes32);
```

