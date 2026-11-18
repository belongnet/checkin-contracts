# Changelog

## [0.0.3.0] - 2026-11-17

Contract changes from the November 2026 security review. Nothing here is deployed yet: the new format takes effect
when the proxies are upgraded, and the backend must switch to the new signature format at the same moment. See
`docs/guides/BelongCheckinSignatures.md` for the format and the rollout order.

### Fixed

- A static-price mint signature can no longer be used as a dynamic-price mint signature. Both digests had the same
  shape, so a signature for a paid whitelist mint was also valid for a mint at price 0 or 1. Every `SignatureVerifier`
  digest now starts with its own type hash. This applies to AccessToken collections created from a new AccessToken
  implementation; existing collections keep the code they were created with.
- Backend signatures now cover everything they authorize. Venue deposits sign `amount` and `rules`, promoter payouts
  sign `paymentInUSDtoken`, AccessToken creation signs the full economics and the referral code, CreditToken creation
  signs the admin, manager, minter and burner roles, and vesting-wallet creation signs the description and the funding
  amount. Before, a caller could change these fields under a valid signature.
- Venue, customer, promoter and creation signatures work once. `Factory` and `BelongCheckIn` record each executed
  digest in `usedSignatures` and reject a second use with `SignatureAlreadyUsed`. Before, the same signature could be
  submitted again until its deadline.
- Only the venue named in a signed deposit, or the customer named in a signed payment, can submit it; any other
  sender reverts with `CallerNotPayer`. Before, any EOA that held a signed payload could execute it against that
  account's allowance, for example after the original transaction reverted and the backend issued a new signature.
- `Factory.upgradeToV2` and `Factory.upgradeToV3` are now `onlyOwner`. Before, anyone could call them on a proxy that
  had not been reinitialized yet.
- `BelongCheckIn` rejects fee and reward percentages above 100% with `PercentageTooHigh`.
- `getReferralRate` returns 0 for a user who is not registered for a referral code instead of reverting. A collection
  produced with a code whose user list was already full could not mint or release royalties.
- A Staking share transfer to oneself no longer erases the lock records of those shares. Before, the holder could then
  leave through the emergency exit without the penalty, and a normal redeem after the lock period failed. Emergency
  withdrawals now also apply the penalty to shares that no lock record covers.

### Changed

- **Breaking for the backend:** all `SignatureVerifier` digests changed. Each one is
  `keccak256(abi.encode(TYPEHASH, verifyingContract, nonce, deadline, chainId, ...payload))` with the payload struct
  encoded as an ABI tuple. `helpers/signature.ts` is the reference implementation.
- `getReferralRate` no longer reverts with `ReferralCodeNotUsedByUser`; the error was removed.
- Deploy, upgrade and update scripts under `scripts/mainnet-deployment` read their toggles strictly:
  `true`/`1`/`yes`/`on` or `false`/`0`/`no`/`off`, and any other value stops the script. An empty toggle now means the
  script's default; in `1-deploy-implementations.ts`, `2-upgrade-factory.ts` and `3-upgrade-factory-v3.ts` an empty
  value used to mean false.
- Deploy scripts stop when the deployment file already records the contract they deploy; `FORCE_REDEPLOY=true`
  overrides. `0-deploy-libraries.ts` takes `LIBRARIES` to deploy a single library and keeps the replaced address.
- Deploy and upgrade scripts stop when a recorded library, or a recorded implementation that the Factory clones, was
  not built from the current checkout. The Factory upgrade scripts write the new implementation to the deployment file
  before they call the reinitializer.
- `13-add-liqudity.ts` reads token decimals from the chain (BSC USDC has 18, not 6), approves the exact amount instead
  of an unlimited allowance, and sets minimum amounts from `SLIPPAGE_BPS`. `13-burn-liquidity.ts` sets minimum amounts
  the same way. `12-create-lp.ts` stops when the pool already exists unless `ALLOW_EXISTING_POOL=true`.
- `14-deploy-vesting-wallet.ts` signs through `helpers/signature.ts` and passes the arguments the current Factory
  expects. The unused old-format digest helpers were removed from `helpers/math.ts`.
- Pinned `@openzeppelin/contracts`, `@openzeppelin/contracts-upgradeable`, `@uniswap/v4-core`, `@uniswap/v4-periphery`,
  `solady` and `solmate` to exact versions (the ones already installed) and regenerated `yarn.lock`, which had no
  entries for the two Uniswap packages and `solmate` and an outdated range for `solady`.

### Added

- `6b-prepare-upgrade-safe.ts`: prepares the Safe transaction that upgrades `Factory`, `Staking` or `BelongCheckIn`.
  It checks the record against the live linkage, the libraries against the local build and the storage layout against
  the live implementation before it deploys anything, and it only proposes an implementation whose on-chain code is the
  local build.
- `18-prepare-ownership-handover-safe.ts`: read-only; prints the transactions that move `Factory`, `VenueToken` and
  `PromoterToken` to a Safe with Solady's two-step handover.
- `.openzeppelin/bsc.json`: the OpenZeppelin upgrade manifest for BSC mainnet, imported from the deployed source.
  `6a-force-import-checkin.ts` now takes `TARGET` and refuses to import a build whose bytecode differs from the live
  implementation.
- `deployCreditTokens` checks the owner, roles and transferability of a credit token that already exists before
  adopting it.
- Tests for each fix above (255 passing, up from 225).

### Notes

- Storage layouts are append-only: `usedSignatures` is the last variable of `BelongCheckIn` and of `Factory`. Checked
  with `upgrades.validateUpgrade` against the three live BSC proxies.
- `11-test-venueDeposit.ts` was already out of date with the deployed contracts and still is.
- `docs/src` (forge doc output) was not regenerated; `docs/contracts` was.

## [0.0.2.4] - 2026-11-16

### Fixed

- Landed the BSC mainnet deployment-record reconciliation on `main`. The 0.0.2.1–0.0.2.3 work below had been waiting on an unmerged branch since July, so `main` still pointed the CheckIn upgrade scripts at the pre-July `DualDexSwapV4Lib` (`0x483417ef…`); an implementation prepared from it would have relinked the library with the stale router selector.
- Re-verified `deployments/chainId-56.json` field by field against live BSC state on 2026-11-16 (block 133,930,731): CheckIn and Factory implementations, linked libraries, Factory implementations, CheckIn `paymentsInfo`, and credit-token parameters all match.

### Changed

- Renumbered the three entries below from their draft numbers (0.0.1.1–0.0.1.3) so versions stay in date order after 0.0.2.0.

## [0.0.2.3] - 2026-07-08

### Fixed

- Reconciled `checkIn.paymentsInfo.poolKey` in `deployments/chainId-56.json` with live chain state. The recorded key was the January deploy-time value (fee `0x12c`, tickSpacing 500), whose pool was never initialized on the Infinity CL pool manager; the live key (set via Safe `setPaymentsInfo`, executed 2026-04-28) targets the real USDC/LONG pool `0x581f5d75…` (fee 0.3355%, tickSpacing 10) — the same pool the `long-price` feed service monitors.

### Notes

- Root cause of the post-upgrade `TooLittleReceived` reverts identified: the LONGPriceFeed answer and the Infinity pool's executable price diverged beyond the 5% slippage ceiling (pool traded up to ~9.6% above the Gate CEX price on 2026-07-06/07, while the feed published between the two or froze on source-quorum failure for up to 19.2h). Deposits also revert on feed staleness (`maxPriceFeedDelay` = 3600s) whenever the feed freezes for over an hour. Fix tracked in the `long-price` service and pool-liquidity operations, not in the contracts.

## [0.0.2.2] - 2026-07-08

### Fixed

- Executed the BSC mainnet `BelongCheckIn` proxy upgrade via the ProxyAdmin Safe (safeTxHash `0x859659e8…`), switching the live implementation from `0xbA41C845…` to `0xdA73910a…`, linked against the corrected `DualDexSwapV4Lib` (`0x55B7b0eD…`). Resolves the router-selector mismatch (`executeActions` vs `execute`) that caused `venueDeposit` swaps to revert. `deployments/chainId-56.json` now reflects the live `checkIn.implementation`; the resolved `pendingUpgrade` block has been removed.
- Verified `0xdA73910a…` on BscScan (previously undeployed-looking/unverified, which had blocked sign-off on the pending Safe transaction).

### Notes

- A second `DualDexSwapV4Lib` instance (`0x966E0535…`) was deployed and verified during troubleshooting but is unused — the live implementation links against `0x55B7b0eD…`. No action needed; noted here so it isn't mistaken for the active library later.
- Post-upgrade testing surfaced a separate, unresolved issue: `venueDeposit` now reaches the real swap path but can revert with Pancake `TooLittleReceived` when the oracle-vs-pool price divergence exceeds the configured 1% slippage tolerance. Tracked separately from this upgrade.

## [0.0.2.1] - 2026-06-30

### Fixed

- Recorded the BSC mainnet `DualDexSwapV4Lib` redeploy (`0x55B7b0eD…` fixing the stale `executeActions` selector mismatch) and the pending `BelongCheckIn` proxy upgrade (`0xdA73910a…`) in `deployments/chainId-56.json`, which had drifted out of sync with both live chain state and the queued Safe transaction.
- Added `6a-force-import-checkin.ts` to register an already-deployed `BelongCheckIn` proxy in the local OpenZeppelin upgrade-safety manifest, needed before `6-prepare-checkin-upgrade-safe.ts` can validate an upgrade against it.

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
