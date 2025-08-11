# Solidity API

## ERC20Bridgeable

_ERC20 extension that implements the standard token interface according to
https://eips.ethereum.org/EIPS/eip-7802[ERC-7802].

NOTE: To implement a crosschain gateway for a chain, consider using an implementation if {IERC7786} token
bridge (e.g. {AxelarGatewaySource}, {AxelarGatewayDestination})._

### onlyTokenBridge

```solidity
modifier onlyTokenBridge()
```

_Modifier to restrict access to the token bridge._

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```

_See {IERC165-supportsInterface}._

### crosschainMint

```solidity
function crosschainMint(address to, uint256 value) public virtual
```

_See {IERC7802-crosschainMint}. Emits a {CrosschainMint} event._

### crosschainBurn

```solidity
function crosschainBurn(address from, uint256 value) public virtual
```

_See {IERC7802-crosschainBurn}. Emits a {CrosschainBurn} event._

### _checkTokenBridge

```solidity
function _checkTokenBridge(address caller) internal virtual
```

_Checks if the caller is a trusted token bridge. MUST revert otherwise.

Developers should implement this function using an access control mechanism that allows
customizing the list of allowed senders. Consider using {AccessControl} or {AccessManaged}._

