# DualDexSwapV4
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/platform/extensions/DualDexSwapV4.sol)

Thin stateful wrapper over {DualDexSwapV4Lib} storing the active payments configuration.


## State Variables
### _paymentsInfo

```solidity
DualDexSwapV4Lib.PaymentsInfo internal _paymentsInfo
```


## Functions
### paymentsInfo

Returns the stored payments configuration.


```solidity
function paymentsInfo() external view returns (DualDexSwapV4Lib.PaymentsInfo memory info);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`info`|`DualDexSwapV4Lib.PaymentsInfo`|The persisted {PaymentsInfo} struct.|


### _storePaymentsInfo

Stores a payments configuration without altering the active dex selection.


```solidity
function _storePaymentsInfo(DualDexSwapV4Lib.PaymentsInfo calldata info) internal;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`info`|`DualDexSwapV4Lib.PaymentsInfo`|New payments configuration to persist.|


### _swapUSDtokenToLONG

Swaps USDC to LONG for a recipient using the configured v4 router.


```solidity
function _swapUSDtokenToLONG(address recipient, uint256 amount, uint256 deadline)
    internal
    virtual
    returns (uint256 swapped);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`recipient`|`address`|Address receiving the LONG output.|
|`amount`|`uint256`|Exact USDC amount to swap.|
|`deadline`|`uint256`|Unix timestamp after which the swap should revert (0 to use library default).|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`swapped`|`uint256`|The amount of LONG delivered to `recipient`.|


### _swapLONGtoUSDtoken

Swaps LONG to USDC for a recipient using the configured v4 router.


```solidity
function _swapLONGtoUSDtoken(address recipient, uint256 amount, uint256 deadline)
    internal
    virtual
    returns (uint256 swapped);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`recipient`|`address`|Address receiving the USDC output.|
|`amount`|`uint256`|Exact LONG amount to swap.|
|`deadline`|`uint256`|Unix timestamp after which the swap should revert (0 to use library default).|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`swapped`|`uint256`|The amount of USDC delivered to `recipient`.|


### _swapExactPath

Executes a multi-hop swap along a precomputed path using the configured dex.


```solidity
function _swapExactPath(DualDexSwapV4Lib.ExactInputMultiParams memory params)
    internal
    virtual
    returns (uint256 received);
```

### _quoteUSDtokenToLONG


```solidity
function _quoteUSDtokenToLONG(uint256) internal view virtual returns (uint256);
```

### _quoteLONGtoUSDtoken


```solidity
function _quoteLONGtoUSDtoken(uint256) internal view virtual returns (uint256);
```

## Events
### PaymentsInfoSet
Emitted when the payments configuration is updated.


```solidity
event PaymentsInfoSet(DualDexSwapV4Lib.PaymentsInfo info);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`info`|`DualDexSwapV4Lib.PaymentsInfo`|The new payments configuration.|

## Errors
### BPSTooHigh
Reverts when a provided bps value exceeds the configured scaling domain.


```solidity
error BPSTooHigh();
```

