# Escrow
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/periphery/Escrow.sol)

**Inherits:**
Initializable

**Title:**
BelongCheckIn Escrow

Custodies venue deposits in USDtoken and LONG, and disburses funds on instructions
from the BelongCheckIn platform.


- Tracks per-venue balances for USDtoken and LONG.
- Only the BelongCheckIn contract may call mutating methods via [onlyBelongCheckIn](/contracts/v2/periphery/Escrow.sol/contract.Escrow.md#onlybelongcheckin).
- Uses SafeTransferLib for robust ERC20 transfers.
- Designed for use behind an upgradeable proxy.


## State Variables
### belongCheckIn
BelongCheckIn platform contract authorized to operate this escrow.


```solidity
BelongCheckIn public belongCheckIn
```


### venueDeposits
Mapping of per-venue deposits tracked by currency.


```solidity
mapping(address venue => VenueDeposits deposits) public venueDeposits
```


## Functions
### constructor

**Note:**
oz-upgrades-unsafe-allow: constructor


```solidity
constructor() ;
```

### initialize

Initializes the escrow with its controlling BelongCheckIn contract.

Must be called exactly once (initializer).


```solidity
function initialize(BelongCheckIn _belongCheckIn) external initializer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_belongCheckIn`|`BelongCheckIn`|Address of the BelongCheckIn contract.|


### onlyBelongCheckIn

Restricts function to only be callable by the BelongCheckIn contract.


```solidity
modifier onlyBelongCheckIn() ;
```

### venueDeposit

Records/overwrites a venue's deposit balances after a deposit operation.

Called by BelongCheckIn when new funds are received and routed to escrow.


```solidity
function venueDeposit(address venue, uint256 depositedUSDtokens, uint256 depositedLONGs)
    external
    onlyBelongCheckIn;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`venue`|`address`|Venue whose balances are being updated.|
|`depositedUSDtokens`|`uint256`|New USDtoken balance to record for `venue`.|
|`depositedLONGs`|`uint256`|New LONG balance to record for `venue`.|


### distributeLONGDeposit

Disburses LONG discount funds from a venue's LONG balance to the venue.

Reverts if the venue does not have enough LONG recorded.


```solidity
function distributeLONGDeposit(address venue, address to, uint256 amount) external onlyBelongCheckIn;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`venue`|`address`|Venue whose LONG balance will decrease.|
|`to`|`address`|Recipient of the LONG transfer.|
|`amount`|`uint256`|Amount of LONG to transfer.|


### distributeVenueDeposit

Disburses USDtoken funds from a venue's USDtoken balance to a recipient.

Reverts if the venue does not have enough USDtoken recorded.


```solidity
function distributeVenueDeposit(address venue, address to, uint256 amount) external onlyBelongCheckIn;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`venue`|`address`|Venue whose USDtoken balance will decrease.|
|`to`|`address`|Recipient of the USDtoken transfer.|
|`amount`|`uint256`|Amount of USDtoken to transfer.|


## Events
### VenueDepositsUpdated
Emitted whenever a venue's escrow balances are updated.


```solidity
event VenueDepositsUpdated(address indexed venue, VenueDeposits deposits);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`venue`|`address`|Venue address.|
|`deposits`|`VenueDeposits`|New USDtoken and LONG balances recorded for the venue.|

### DistributedLONGDeposit
Emitted when LONG discount funds are disbursed to a venue.


```solidity
event DistributedLONGDeposit(address indexed venue, address indexed to, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`venue`|`address`|Venue whose LONG balance decreased.|
|`to`|`address`|Recipient of the LONG transfer.|
|`amount`|`uint256`|Amount of LONG transferred.|

### DistributedVenueDeposit
Emitted when USDtoken deposit funds are disbursed from a venue's balance.


```solidity
event DistributedVenueDeposit(address indexed venue, address indexed to, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`venue`|`address`|Venue whose USDtoken balance decreased.|
|`to`|`address`|Recipient of the USDtoken transfer.|
|`amount`|`uint256`|Amount of USDtoken transferred.|

## Errors
### NotBelongCheckIn
Reverts when a non-authorized caller attempts a BelongCheckIn-only action.


```solidity
error NotBelongCheckIn();
```

### NotEnoughLONGs
Reverts when a LONG disbursement exceeds the venue's LONG balance.


```solidity
error NotEnoughLONGs(uint256 longDeposits, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`longDeposits`|`uint256`|Current LONG balance on record.|
|`amount`|`uint256`|Requested LONG amount.|

### NotEnoughUSDTokens
Reverts when a USDtoken disbursement exceeds the venue's USDtoken balance.


```solidity
error NotEnoughUSDTokens(uint256 usdTokenDeposits, uint256 amount);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`usdTokenDeposits`|`uint256`|Current USDtoken balance on record.|
|`amount`|`uint256`|Requested USDtoken amount.|

## Structs
### VenueDeposits
Per-venue escrowed amounts for USDtoken and LONG.


```solidity
struct VenueDeposits {
    uint256 usdTokenDeposits;
    uint256 longDeposits;
}
```

