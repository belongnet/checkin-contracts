# Solidity API

## IERC20Burnable

### transfer

```solidity
function transfer(address to, uint256 value) external returns (bool)
```

_See {IERC20-transfer}.

Requirements:

- `to` cannot be the zero address.
- the caller must have a balance of at least `value`._

### burn

```solidity
function burn(uint256 value) external
```

_Destroys a `value` amount of tokens from the caller.

See {ERC20-_burn}._

### burnFrom

```solidity
function burnFrom(address account, uint256 value) external
```

_Destroys a `value` amount of tokens from `account`, deducting from
the caller's allowance.

See {ERC20-_burn} and {ERC20-allowance}.

Requirements:

- the caller must have allowance for ``accounts``'s tokens of at least
`value`._

