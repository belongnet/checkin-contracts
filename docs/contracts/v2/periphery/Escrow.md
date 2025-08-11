# Solidity API

## Escrow

Custodies venue deposits in USDC and LONG, and disburses funds on instructions
        from the TapAndEarn platform.
@dev
- Tracks per-venue balances for USDC and LONG.
- Only the TapAndEarn contract may call mutating methods via {onlyTapEarn}.
- Uses SafeTransferLib for robust ERC20 transfers.
- Designed for use behind an upgradeable proxy.

### NotTapAndEarn

```solidity
error NotTapAndEarn()
```

Reverts when a non-authorized caller attempts a TapAndEarn-only action.

### NotEnoughLONGs

```solidity
error NotEnoughLONGs(uint256 longDeposits, uint256 amount)
```

Reverts when a LONG disbursement exceeds the venue's LONG balance.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| longDeposits | uint256 | Current LONG balance on record. |
| amount | uint256 | Requested LONG amount. |

### NotEnoughUSDCs

```solidity
error NotEnoughUSDCs(uint256 usdcDeposits, uint256 amount)
```

Reverts when a USDC disbursement exceeds the venue's USDC balance.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| usdcDeposits | uint256 | Current USDC balance on record. |
| amount | uint256 | Requested USDC amount. |

### VenueDepositsUpdated

```solidity
event VenueDepositsUpdated(address venue, uint256 usdcDeposits, uint256 longDeposits)
```

Emitted whenever a venue's escrow balances are updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venue | address | Venue address. |
| usdcDeposits | uint256 | New USDC balance recorded for the venue. |
| longDeposits | uint256 | New LONG balance recorded for the venue. |

### DistributedLONGDiscount

```solidity
event DistributedLONGDiscount(address venue, uint256 amount)
```

Emitted when LONG discount funds are disbursed to a venue.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venue | address | Venue receiving the LONG subsidy. |
| amount | uint256 | Amount of LONG transferred. |

### DistributedVenueDeposit

```solidity
event DistributedVenueDeposit(address venue, address to, uint256 amount)
```

Emitted when USDC deposit funds are disbursed from a venue's balance.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venue | address | Venue whose USDC balance decreased. |
| to | address | Recipient of the USDC transfer. |
| amount | uint256 | Amount of USDC transferred. |

### VenueDeposits

Per-venue escrowed amounts for USDC and LONG.

```solidity
struct VenueDeposits {
  uint256 usdcDeposits;
  uint256 longDeposits;
}
```

### tapAndEarn

```solidity
contract TapAndEarn tapAndEarn
```

TapAndEarn platform contract authorized to operate this escrow.

### venueDeposits

```solidity
mapping(address => struct Escrow.VenueDeposits) venueDeposits
```

Mapping of per-venue deposits tracked by currency.

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(contract TapAndEarn _tapAndEarn) external
```

Initializes the escrow with its controlling TapAndEarn contract.

_Must be called exactly once (initializer)._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tapAndEarn | contract TapAndEarn | Address of the TapAndEarn contract. |

### onlyTapEarn

```solidity
modifier onlyTapEarn()
```

Restricts function to only be callable by the TapAndEarn contract.

### venueDeposit

```solidity
function venueDeposit(address venue, uint256 depositedUSDCs, uint256 depositedLONGs) external
```

Records/overwrites a venue's deposit balances after a deposit operation.

_Called by TapAndEarn when new funds are received and routed to escrow._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venue | address | Venue whose balances are being updated. |
| depositedUSDCs | uint256 | New USDC balance to record for `venue`. |
| depositedLONGs | uint256 | New LONG balance to record for `venue`. |

### distributeLONGDiscount

```solidity
function distributeLONGDiscount(address venue, uint256 amount) external
```

Disburses LONG discount funds from a venue's LONG balance to the venue.

_Reverts if the venue does not have enough LONG recorded._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venue | address | Venue receiving the LONG transfer. |
| amount | uint256 | Amount of LONG to transfer. |

### distributeVenueDeposit

```solidity
function distributeVenueDeposit(address venue, address to, uint256 amount) external
```

Disburses USDC funds from a venue's USDC balance to a recipient.

_Reverts if the venue does not have enough USDC recorded._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| venue | address | Venue whose USDC balance will decrease. |
| to | address | Recipient of the USDC transfer. |
| amount | uint256 | Amount of USDC to transfer. |

