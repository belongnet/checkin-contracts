# Solidity API

## LONG

ERC-20 token with burn, pause, permit, and bridge authorization for Superchain deployments.
@dev
- Mints a fixed initial supply to `mintTo` in the constructor.
- `pause`/`unpause` restricted to `PAUSER_ROLE`.
- Enforces bridge calls to come only from the predeployed `SuperchainTokenBridge`.

### Unauthorized

```solidity
error Unauthorized()
```

Revert used by bridge guard and role checks.

### SUPERCHAIN_TOKEN_BRIDGE

```solidity
address SUPERCHAIN_TOKEN_BRIDGE
```

Predeployed SuperchainTokenBridge address (only this may call bridge hooks).

### PAUSER_ROLE

```solidity
bytes32 PAUSER_ROLE
```

Role identifier for pausing/unpausing transfers.

### constructor

```solidity
constructor(address mintTo, address defaultAdmin, address pauser) public
```

Deploys LONG and mints initial supply to `mintTo`; sets admin and pauser roles.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mintTo | address | Recipient of the initial token supply. |
| defaultAdmin | address | Address granted `DEFAULT_ADMIN_ROLE`. |
| pauser | address | Address granted `PAUSER_ROLE`. |

### _checkTokenBridge

```solidity
function _checkTokenBridge(address caller) internal pure
```

Bridge guard: ensures only the canonical Superchain bridge may call.

_Overridden from `ERC20Bridgeable`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | The caller address to validate. |

### pause

```solidity
function pause() public
```

Pause token transfers and approvals.

_Callable by addresses holding `PAUSER_ROLE`._

### unpause

```solidity
function unpause() public
```

Unpause token transfers and approvals.

_Callable by addresses holding `PAUSER_ROLE`._

### _update

```solidity
function _update(address from, address to, uint256 value) internal
```

_Transfers a `value` amount of tokens from `from` to `to`, or alternatively mints (or burns) if `from`
(or `to`) is the zero address. All customizations to transfers, mints, and burns should be done by overriding
this function.

Emits a {Transfer} event._

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

_See {IERC165-supportsInterface}._

