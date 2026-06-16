# Changelog

## [0.0.2.0] - 2026-06-15

### Changed

- Raised the default BelongCheckIn swap slippage for new deployments from 1% to 5% (in Helper's 1e27 domain) so BSC venue deposits stop reverting on too-tight slippage.

### Added

- `17-update-payments-info.ts` to update a live BelongCheckIn's stored `slippageBps` from on-chain `paymentsInfo()` without trusting stale deployment-file routing. It preserves the active router, tokens, `poolKey`, `hookData`, and price-feed delay, gates the transaction behind an owner/signer and `callStatic` check, can emit Safe calldata (`UPDATE=false`), and syncs the deployment JSON only when a `CHECKIN_ADDRESS` override does not diverge from the recorded address.
- Documented the `UPDATE`, `SYNC_DEPLOYMENT_JSON`, `SLIPPAGE_BPS_1E27`, and PancakeSwap Infinity (`PCS_*`, `HOOK_DATA`) environment variables in `.env.example` and the BelongCheckIn guide.

## [0.0.1.0] - 2026-06-01

### Fixed

- Reconciled the BSC mainnet deployment manifest with live production libraries, proxy implementations, and CheckIn payment parameters.
- Restored safe deployment-script flag handling so `DEPLOY=false`, `VERIFY=false`, and `UPGRADE=false` reliably disable those actions while default deploy scripts still run intentionally.
- Defaulted new CheckIn deployments to 1% slippage and a 1-hour price-feed staleness limit, with validation for operator overrides.
- Removed duplicate Hardhat explorer custom-chain entries that could break verification configuration.
