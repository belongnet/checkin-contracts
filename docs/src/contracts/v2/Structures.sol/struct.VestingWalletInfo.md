# VestingWalletInfo
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/Structures.sol)

**Title:**
VestingWalletInfo

Parameters configuring a vesting wallet schedule and metadata.


```solidity
struct VestingWalletInfo {
/// @notice Vesting start timestamp (TGE) in seconds since epoch.
uint64 startTimestamp;
/// @notice Cliff duration in seconds added to `startTimestamp` for the linear section to begin.
uint64 cliffDurationSeconds;
/// @notice Linear vesting duration in seconds counted from `cliff`.
uint64 durationSeconds;
/// @notice ERC-20 token being vested.
address token;
/// @notice Recipient of vested token releases.
address beneficiary;
/// @notice Total tokens allocated to this vesting schedule (must equal TGE + linear + tranches).
uint256 totalAllocation;
/// @notice One-off amount vested immediately at `startTimestamp`.
uint256 tgeAmount;
/// @notice Amount linearly vested over `durationSeconds` starting at `cliff`.
uint256 linearAllocation;
/// @notice Human-readable description of the vesting schedule.
string description;
}
```

