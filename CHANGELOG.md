# Changelog

## [0.0.1.0] - 2026-06-01

### Fixed

- Reconciled the BSC mainnet deployment manifest with live production libraries, proxy implementations, and CheckIn payment parameters.
- Restored safe deployment-script flag handling so `DEPLOY=false`, `VERIFY=false`, and `UPGRADE=false` reliably disable those actions while default deploy scripts still run intentionally.
- Defaulted new CheckIn deployments to 1% slippage and a 1-hour price-feed staleness limit, with validation for operator overrides.
- Removed duplicate Hardhat explorer custom-chain entries that could break verification configuration.
