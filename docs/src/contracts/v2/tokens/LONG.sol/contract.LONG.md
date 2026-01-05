# LONG
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/tokens/LONG.sol)

**Inherits:**
Initializable, ERC20Upgradeable, ERC20BridgeableUpgradeable, ERC20BurnableUpgradeable, ERC20PausableUpgradeable, AccessControlUpgradeable, ERC20PermitUpgradeable

**Title:**
LONG

ERC-20 token with burn, pause, permit, and bridge authorization for Superchain deployments.


- Mints a fixed initial supply to `mintTo` in the constructor.
- `pause`/`unpause` restricted to `PAUSER_ROLE`.
- Enforces bridge calls to come only from the predeployed `SuperchainTokenBridge`.


## State Variables
### SUPERCHAIN_TOKEN_BRIDGE
Predeployed SuperchainTokenBridge address (only this may call bridge hooks).


```solidity
address internal constant SUPERCHAIN_TOKEN_BRIDGE = 0x4200000000000000000000000000000000000028
```


### PAUSER_ROLE
Role identifier for pausing/unpausing transfers.


```solidity
bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE")
```


## Functions
### constructor

**Note:**
oz-upgrades-unsafe-allow: constructor


```solidity
constructor() ;
```

### initialize

Initializes LONG and mints initial supply to `recipient`; sets admin and pauser roles.


```solidity
function initialize(address recipient, address defaultAdmin, address pauser) public initializer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`recipient`|`address`|Recipient of the initial token supply.|
|`defaultAdmin`|`address`|Address granted `DEFAULT_ADMIN_ROLE`.|
|`pauser`|`address`|Address granted `PAUSER_ROLE`.|


### _checkTokenBridge

Checks if the caller is the predeployed SuperchainTokenBridge. Reverts otherwise.
IMPORTANT: The predeployed SuperchainTokenBridge is only available on chains in the Superchain.


```solidity
function _checkTokenBridge(address caller) internal pure override;
```

### pause

Pause token transfers and approvals.

Callable by addresses holding `PAUSER_ROLE`.


```solidity
function pause() public onlyRole(PAUSER_ROLE);
```

### unpause

Unpause token transfers and approvals.

Callable by addresses holding `PAUSER_ROLE`.


```solidity
function unpause() public onlyRole(PAUSER_ROLE);
```

### _update

Transfers a `value` amount of tokens from `from` to `to`, or alternatively mints (or burns) if `from`
(or `to`) is the zero address. All customizations to transfers, mints, and burns should be done by overriding
this function.
Emits a {Transfer} event.


```solidity
function _update(address from, address to, uint256 value)
    internal
    override(ERC20Upgradeable, ERC20PausableUpgradeable);
```

### supportsInterface


```solidity
function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC20BridgeableUpgradeable, AccessControlUpgradeable)
    returns (bool);
```

## Errors
### Unauthorized
Revert used by bridge guard and role checks.


```solidity
error Unauthorized();
```

