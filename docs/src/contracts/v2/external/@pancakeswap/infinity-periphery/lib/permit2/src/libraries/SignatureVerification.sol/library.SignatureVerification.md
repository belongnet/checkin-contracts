# SignatureVerification
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/lib/permit2/src/libraries/SignatureVerification.sol)


## State Variables
### UPPER_BIT_MASK

```solidity
bytes32 constant UPPER_BIT_MASK = (0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff)
```


## Functions
### verify


```solidity
function verify(bytes calldata signature, bytes32 hash, address claimedSigner) internal view;
```

## Errors
### InvalidSignatureLength
Thrown when the passed in signature is not a valid length


```solidity
error InvalidSignatureLength();
```

### InvalidSignature
Thrown when the recovered signer is equal to the zero address


```solidity
error InvalidSignature();
```

### InvalidSigner
Thrown when the recovered signer does not equal the claimedSigner


```solidity
error InvalidSigner();
```

### InvalidContractSignature
Thrown when the recovered contract signature is incorrect


```solidity
error InvalidContractSignature();
```

