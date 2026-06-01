# Solidity API

## DualDexSwapV4

Thin stateful wrapper over {DualDexSwapV4Lib} storing the active payments configuration.

### BPSTooHigh

```solidity
error BPSTooHigh()
```

Reverts when a provided bps value exceeds the configured scaling domain.

### PaymentsInfoSet

```solidity
event PaymentsInfoSet(struct DualDexSwapV4Lib.PaymentsInfo info)
```

Emitted when the payments configuration is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| info | struct DualDexSwapV4Lib.PaymentsInfo | The new payments configuration. |

### _paymentsInfo

```solidity
struct DualDexSwapV4Lib.PaymentsInfo _paymentsInfo
```

### paymentsInfo

```solidity
function paymentsInfo() external view returns (struct DualDexSwapV4Lib.PaymentsInfo info)
```

Returns the stored payments configuration.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| info | struct DualDexSwapV4Lib.PaymentsInfo | The persisted {PaymentsInfo} struct. |

### _storePaymentsInfo

```solidity
function _storePaymentsInfo(struct DualDexSwapV4Lib.PaymentsInfo info) internal
```

Stores a payments configuration without altering the active dex selection.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| info | struct DualDexSwapV4Lib.PaymentsInfo | New payments configuration to persist. |

### _swapUSDtokenToLONG

```solidity
function _swapUSDtokenToLONG(address recipient, uint256 amount, uint256 deadline) internal virtual returns (uint256 swapped)
```

Swaps USDC to LONG for a recipient using the configured v4 router.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | Address receiving the LONG output. |
| amount | uint256 | Exact USDC amount to swap. |
| deadline | uint256 | Unix timestamp after which the swap should revert (0 to use library default). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| swapped | uint256 | The amount of LONG delivered to `recipient`. |

### _swapLONGtoUSDtoken

```solidity
function _swapLONGtoUSDtoken(address recipient, uint256 amount, uint256 deadline) internal virtual returns (uint256 swapped)
```

Swaps LONG to USDC for a recipient using the configured v4 router.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | Address receiving the USDC output. |
| amount | uint256 | Exact LONG amount to swap. |
| deadline | uint256 | Unix timestamp after which the swap should revert (0 to use library default). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| swapped | uint256 | The amount of USDC delivered to `recipient`. |

### _swapExactPath

```solidity
function _swapExactPath(struct DualDexSwapV4Lib.ExactInputMultiParams params) internal virtual returns (uint256 received)
```

Executes a multi-hop swap along a precomputed path using the configured dex.

### _quoteUSDtokenToLONG

```solidity
function _quoteUSDtokenToLONG(uint256) internal view virtual returns (uint256)
```

### _quoteLONGtoUSDtoken

```solidity
function _quoteLONGtoUSDtoken(uint256) internal view virtual returns (uint256)
```

