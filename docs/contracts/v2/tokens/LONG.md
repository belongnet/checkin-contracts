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
constructor() public
```

### initialize

```solidity
function initialize(address recipient, address defaultAdmin, address pauser) public
```

Initializes LONG and mints initial supply to `recipient`; sets admin and pauser roles.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | Recipient of the initial token supply. |
| defaultAdmin | address | Address granted `DEFAULT_ADMIN_ROLE`. |
| pauser | address | Address granted `PAUSER_ROLE`. |

### _checkTokenBridge

```solidity
function _checkTokenBridge(address caller) internal pure
```

_Checks if the caller is the predeployed SuperchainTokenBridge. Reverts otherwise.

IMPORTANT: The predeployed SuperchainTokenBridge is only available on chains in the Superchain._

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

_Returns true if this contract implements the interface defined by
`interfaceId`. See the corresponding
https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
to learn more about how these ids are created.

This function call must use less than 30 000 gas._

