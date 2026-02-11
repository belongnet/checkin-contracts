# CalldataDecoder
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/libraries/CalldataDecoder.sol)

**Title:**
Library for abi decoding in calldata


## State Variables
### OFFSET_OR_LENGTH_MASK
mask used for offsets and lengths to ensure no overflow

no sane abi encoding will pass in an offset or length greater than type(uint32).max
(note that this does deviate from standard solidity behavior and offsets/lengths will
be interpreted as mod type(uint32).max which will only impact malicious/buggy callers)


```solidity
uint256 constant OFFSET_OR_LENGTH_MASK = 0xffffffff
```


### OFFSET_OR_LENGTH_MASK_AND_WORD_ALIGN

```solidity
uint256 constant OFFSET_OR_LENGTH_MASK_AND_WORD_ALIGN = 0xffffffe0
```


### SLICE_ERROR_SELECTOR
equivalent to SliceOutOfBounds.selector, stored in least-significant bits


```solidity
uint256 constant SLICE_ERROR_SELECTOR = 0x3b99b53d
```


## Functions
### decodeActionsRouterParams

equivalent to: abi.decode(params, (bytes, bytes[])) in calldata (requires strict abi encoding)


```solidity
function decodeActionsRouterParams(bytes calldata _bytes)
    internal
    pure
    returns (bytes calldata actions, bytes[] calldata params);
```

### decodeCurrency

equivalent to: abi.decode(params, (Currency)) in calldata


```solidity
function decodeCurrency(bytes calldata params) internal pure returns (Currency currency);
```

### decodeCurrencyPair

equivalent to: abi.decode(params, (Currency, Currency)) in calldata


```solidity
function decodeCurrencyPair(bytes calldata params) internal pure returns (Currency currency0, Currency currency1);
```

### decodeCurrencyPairAndAddress

equivalent to: abi.decode(params, (Currency, Currency, address)) in calldata


```solidity
function decodeCurrencyPairAndAddress(bytes calldata params)
    internal
    pure
    returns (Currency currency0, Currency currency1, address _address);
```

### decodeCurrencyAndAddress

equivalent to: abi.decode(params, (Currency, address)) in calldata


```solidity
function decodeCurrencyAndAddress(bytes calldata params)
    internal
    pure
    returns (Currency currency, address _address);
```

### decodeCurrencyAddressAndUint256

equivalent to: abi.decode(params, (Currency, address, uint256)) in calldata


```solidity
function decodeCurrencyAddressAndUint256(bytes calldata params)
    internal
    pure
    returns (Currency currency, address _address, uint256 amount);
```

### decodeCurrencyAndUint256

equivalent to: abi.decode(params, (Currency, uint256)) in calldata


```solidity
function decodeCurrencyAndUint256(bytes calldata params) internal pure returns (Currency currency, uint256 amount);
```

### decodeUint256

equivalent to: abi.decode(params, (uint256)) in calldata


```solidity
function decodeUint256(bytes calldata params) internal pure returns (uint256 amount);
```

### decodeCurrencyUint256AndBool

equivalent to: abi.decode(params, (Currency, uint256, bool)) in calldata


```solidity
function decodeCurrencyUint256AndBool(bytes calldata params)
    internal
    pure
    returns (Currency currency, uint256 amount, bool boolean);
```

### toBytes

Decode the `_arg`-th element in `_bytes` as `bytes`


```solidity
function toBytes(bytes calldata _bytes, uint256 _arg) internal pure returns (bytes calldata res);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_bytes`|`bytes`|The input bytes string to extract a bytes string from|
|`_arg`|`uint256`|The index of the argument to extract|


## Errors
### SliceOutOfBounds

```solidity
error SliceOutOfBounds();
```

