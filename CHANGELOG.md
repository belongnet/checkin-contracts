# Changelog

## [0.0.1.3] - 2026-07-08

### Fixed

- Reconciled `checkIn.paymentsInfo.poolKey` in `deployments/chainId-56.json` with live chain state. The recorded key was the January deploy-time value (fee `0x12c`, tickSpacing 500), whose pool was never initialized on the Infinity CL pool manager; the live key (set via Safe `setPaymentsInfo`, executed 2026-04-28) targets the real USDC/LONG pool `0x581f5d75…` (fee 0.3355%, tickSpacing 10) — the same pool the `long-price` feed service monitors.

### Notes

- Root cause of the post-upgrade `TooLittleReceived` reverts identified: the LONGPriceFeed answer and the Infinity pool's executable price diverged beyond the 5% slippage ceiling (pool traded up to ~9.6% above the Gate CEX price on 2026-07-06/07, while the feed published between the two or froze on source-quorum failure for up to 19.2h). Deposits also revert on feed staleness (`maxPriceFeedDelay` = 3600s) whenever the feed freezes for over an hour. Fix tracked in the `long-price` service and pool-liquidity operations, not in the contracts.

## [0.0.1.2] - 2026-07-08

### Fixed

- Executed the BSC mainnet `BelongCheckIn` proxy upgrade via the ProxyAdmin Safe (safeTxHash `0x859659e8…`), switching the live implementation from `0xbA41C845…` to `0xdA73910a…`, linked against the corrected `DualDexSwapV4Lib` (`0x55B7b0eD…`). Resolves the router-selector mismatch (`executeActions` vs `execute`) that caused `venueDeposit` swaps to revert. `deployments/chainId-56.json` now reflects the live `checkIn.implementation`; the resolved `pendingUpgrade` block has been removed.
- Verified `0xdA73910a…` on BscScan (previously undeployed-looking/unverified, which had blocked sign-off on the pending Safe transaction).

### Notes

- A second `DualDexSwapV4Lib` instance (`0x966E0535…`) was deployed and verified during troubleshooting but is unused — the live implementation links against `0x55B7b0eD…`. No action needed; noted here so it isn't mistaken for the active library later.
- Post-upgrade testing surfaced a separate, unresolved issue: `venueDeposit` now reaches the real swap path but can revert with Pancake `TooLittleReceived` when the oracle-vs-pool price divergence exceeds the configured 1% slippage tolerance. Tracked separately from this upgrade.

## [0.0.1.1] - 2026-06-30

### Fixed

- Recorded the BSC mainnet `DualDexSwapV4Lib` redeploy (`0x55B7b0eD…` fixing the stale `executeActions` selector mismatch) and the pending `BelongCheckIn` proxy upgrade (`0xdA73910a…`) in `deployments/chainId-56.json`, which had drifted out of sync with both live chain state and the queued Safe transaction.
- Added `6a-force-import-checkin.ts` to register an already-deployed `BelongCheckIn` proxy in the local OpenZeppelin upgrade-safety manifest, needed before `6-prepare-checkin-upgrade-safe.ts` can validate an upgrade against it.

## [0.0.1.0] - 2026-06-01

### Fixed

- Reconciled the BSC mainnet deployment manifest with live production libraries, proxy implementations, and CheckIn payment parameters.
- Restored safe deployment-script flag handling so `DEPLOY=false`, `VERIFY=false`, and `UPGRADE=false` reliably disable those actions while default deploy scripts still run intentionally.
- Defaulted new CheckIn deployments to 1% slippage and a 1-hour price-feed staleness limit, with validation for operator overrides.
- Removed duplicate Hardhat explorer custom-chain entries that could break verification configuration.
