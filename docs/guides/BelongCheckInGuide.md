# BelongCheckIn – Deployment & Upgrade Guide

Hardhat scripts under `scripts/mainnet-deployment/belong-checkin` deploy, upgrade, and verify the BelongCheckIn stack. The main flow covers:

- Libraries: `SignatureVerifier`, `Helper`
- Implementations: `AccessToken`, `CreditToken`, `RoyaltiesReceiverV2`, `VestingWallet`
- Core/proxies: `Factory`, `BelongCheckIn`, `Escrow`
- Tokens: `LONG`, `VenueToken`, `PromoterToken`, `Staking`

Utility scripts (`6-upgrade-checkin.ts`, `9-configure-checkin.ts`, `10-configure-tokens.ts`, `11-test-venueDeposit.ts`,
`12-create-lp.ts`, `13-add-liqudity.ts`, `13-burn-liquidity.ts`, `list-positions.ts`) let you upgrade, wire, test, or seed liquidity once the core contracts exist.

Every script reads/writes `deployments/chainId-<id>.json` and can run Etherscan-style verification.

> ⚠️ Use **Node 18 or 20** with Hardhat. Example: `nvm use 20 && yarn install`.

---

## Prerequisites

- Node 18 or 20 via `nvm`
- Yarn (`npm i -g yarn`)
- Funded deployer wallet for the target network
- RPC endpoint (Infura/Alchemy/etc.)
- Explorer API key (Etherscan, Blastscan, Polyscan, …)

---

## Environment Variables

Create `.env` and keep it private. Grouped by usage:

```ini
# RPC / verification
INFURA_ID_PROJECT=<...>            # or ALCHEMY_*
ETHERSCAN_API_KEY=<...>
BLASTSCAN_API_KEY=<...>            # optional
POLYSCAN_API_KEY=<...>             # optional
PK=<hex-private-key>               # deployer signer
LEDGER_ADDRESS=<ledger-label>      # optional label only

# Factory
TRANSFER_VALIDATOR=0x...

# LONG token
MINT_LONG_TO=0x...
ADMIN_ADDRESS=0x...
PAUSER_ADDRESS=0x...

# Staking
TREASURY_ADDRESS=0x...

# BelongCheckIn payments info
UNISWAPV3_POOL_FEES=3000
UNISWAPV3_FACTORY_ADDRESS=0x...
UNISWAPV3_ROUTER_ADDRESS=0x...
UNISWAPV3_QUOTER_ADDRESS=0x...
WNATIVE_ADDRESS=0x...
USDC_ADDRESS=0x...

# Credit tokens deployment
SIGNER_PK=<backend signer private key>

# Post deployment wiring
LONG_PRICE_FEED=0x...

# Liquidity tooling (optional)
LONG_ADDRESS=0x...                # LONG that will pair with USDC on Uniswap V3
UNISWAPV3_NPM_ADDRESS=0x...        # NonFungiblePositionManager
FEE=3000                           # Pool fee tier for scripts 12/13
PRICE_NUM=2                        # Desired token1/token0 ratio numerator (12-create-lp)
PRICE_DEN=1                        # … denominator
LONG_AMOUNT=2200                   # Human-readable LONG amount for add-liquidity (or AMOUNT_LONG_RAW)
USDC_AMOUNT=1100                   # Human-readable USDC amount for add-liquidity (or AMOUNT_USDC_RAW)
BAND=1200                          # Tick radius for add-liquidity if you do not pass TICK_LOWER/TICK_UPPER
# TICK_LOWER=... / TICK_UPPER=...  # Optional explicit ticks
```

> `LONG_ADDRESS` is inferred from deployments in most scripts, but liquidity helpers expect it as an explicit env var.
```

---

## Deployments File Layout

Scripts persist data to `deployments/chainId-<id>.json`. Keep key names exactly as written (note the intentional `sigantureVerifier` spelling).

```json
{
  "libraries": {
    "sigantureVerifier": "0x...",
    "helper": "0x..."
  },
  "implementations": {
    "accessToken": "0x...",
    "creditToken": "0x...",
    "royaltiesReceiver": "0x...",
    "vestingWallet": "0x..."
  },
  "factory": {
    "proxy": "0x...",
    "implementation": "0x..."
  },
  "tokens": {
    "long": "0x...",
    "staking": "0x...",
    "venueToken": {
      "address": "0x...",
      "parameters": [ { "name": "VenueToken", "symbol": "VET", "uri": "contractURI/VenueToken", "transferable": true } ]
    },
    "promoterToken": {
      "address": "0x...",
      "parameters": [ { "name": "PromoterToken", "symbol": "PMT", "uri": "contractURI/PromoterToken", "transferable": true } ]
    }
  },
  "checkIn": {
    "address": "0x...",
    "paymentsInfo": {
      "swapPoolFees": 3000,
      "swapV3Factory": "0x...",
      "swapV3Router": "0x...",
      "swapV3Quoter": "0x...",
      "wNativeCurrency": "0x...",
      "usdc": "0x...",
      "long": "0x...",
      "slippageBps": "999999999999999999999999999",
      "maxPriceFeedDelay": 86400
    },
    "escrow": "0x..."
  }
}
```

> If you pre-fill the JSON manually, match these keys so later scripts can find them.

---

## Run Flags

Scripts honour the following environment toggles (default `true` when unset):

```bash
DEPLOY=true   # perform the deployment logic
VERIFY=true   # run explorer verification after deploying
UPGRADE=true  # (only in upgrade scripts) execute the upgrade
```

Call each script with `yarn hardhat run <script> --network <network>`.

---

## Deployment Order

1. **SignatureVerifier** – `0-deploy-signature-verifier.ts`
   - Populates `deployments.libraries.sigantureVerifier`.
   - Example: `DEPLOY=true VERIFY=true yarn hardhat run scripts/mainnet-deployment/belong-checkin/0-deploy-signature-verifier.ts --network sepolia`

2. **Implementations** – `1-deploy-implementations.ts`
   - Requires `deployments.libraries.sigantureVerifier` from step 1.
   - Deploys AccessToken, CreditToken, RoyaltiesReceiverV2, VestingWallet implementations.

3. **Factory (initial deploy)** – `2-deploy-factory.ts`
   - Needs `TRANSFER_VALIDATOR` plus library/implementation addresses.
   - Stores both proxy and implementation addresses under `deployments.factory`.

4. **Factory Upgrade (optional)** – `2-upgrade-factory.ts`
   - Set `UPGRADE=true` to migrate an existing proxy to the new implementation and configure default royalties.
   - Reuses the addresses written by steps 1–3.

5. **LONG token** – `3-deploy-LONG.ts`
   - Requires `MINT_LONG_TO`, `ADMIN_ADDRESS`, `PAUSER_ADDRESS`.
   - Saves the token address at `deployments.tokens.long`.

6. **Staking** – `4-deploy-staking.ts`
   - Needs `ADMIN_ADDRESS`, `TREASURY_ADDRESS`, and the LONG address from step 5.
   - Writes `deployments.tokens.staking`.

7. **Helper library** – `5-deploy-helper.ts`
   - Deploys the on-chain helper utilities and stores `deployments.libraries.helper`.

8. **BelongCheckIn** – `6-deploy-checkin.ts`
   - Requires:
     - Libraries: `deployments.libraries.sigantureVerifier`, `deployments.libraries.helper`
     - Token: `deployments.tokens.long`
     - Env vars: `ADMIN_ADDRESS`, `UNISWAPV3_POOL_FEES`, `UNISWAPV3_FACTORY_ADDRESS`, `UNISWAPV3_ROUTER_ADDRESS`, `UNISWAPV3_QUOTER_ADDRESS`, `WNATIVE_ADDRESS`, `USDC_ADDRESS`
   - Builds a `paymentsInfo` struct (slippage fixed to `1e27 - 1`, `maxPriceFeedDelay` = 86400 seconds) and stores it alongside the deployed address.

9. **BelongCheckIn Upgrade (optional)** – `6-upgrade-checkin.ts`
   - Set `UPGRADE=true` to point the proxy at a new implementation while keeping libraries linked.

10. **Escrow** – `7-deploy-escrow.ts`
    - Consumes the BelongCheckIn address and records `deployments.checkIn.escrow`.

11. **Credit Tokens** – `8-deploy-credit-tokens.ts`
    - Requires `SIGNER_PK`, `deployments.factory.proxy`, and `deployments.checkIn.address`.
    - Deploys VenueToken and PromoterToken via the factory and persists metadata (including `transferable` flags).

12. **BelongCheckIn Wiring** – `9-configure-checkin.ts`
    - Requires `LONG_PRICE_FEED` plus Factory, Escrow, Staking, VenueToken, and PromoterToken addresses.
    - Calls `setContracts` on BelongCheckIn to register the core contract references.

13. **Token Configuration (optional)** – `10-configure-tokens.ts`
    - Intended for post-deployment token tweaks; currently mirrors `setContracts` behaviour. Safe to re-run when the wiring needs to be refreshed.

14. **Sanity Deposit (optional)** – `11-test-venueDeposit.ts`
    - Exercises `venueDeposit` against the deployed BelongCheckIn contract using the configured `SIGNER_PK`.

15. **Uniswap Pool Setup (optional)** – `12-create-lp.ts`
    - Creates/initialises a LONG/USDC V3 pool using the provided price ratio.

16. **Uniswap Liquidity Management (optional)** – `13-add-liqudity.ts`, `13-burn-liquidity.ts`, `list-positions.ts`
    - Add, remove, or inspect positions once the pool exists. Refer to the in-script comments for the required env vars.

All scripts write back to `deployments/chainId-<id>.json` after every successful action.

---

## Vesting Wallet Deployment (Factory)

Use `scripts/mainnet-deployment/belong-checkin/14-deploy-vesting-wallet.ts` to mint ERC1967 vesting wallet proxies through the Factory. The script signs the payload with the backend signer, validates balances/allowance, and records the deployed wallet in `deployments/chainId-<id>.json` under `vestingWallets`.

**Prerequisites**
- Factory deployed and configured with `implementations.vestingWallet`.
- Vesting token minted to the deployer (script sender) with at least `totalAllocation`.
- Backend signer private key (`SIGNER_PK`) for `checkVestingWalletInfo`.

**Env vars**
```ini
SIGNER_PK=<backend-signer-hex>          # required
FACTORY_ADDRESS=0x...                   # optional, falls back to deployments.factory.proxy
VESTING_TOKEN=0x...                     # optional, falls back to deployments.tokens.long
VESTING_BENEFICIARY=0x...               # required recipient of releases
VESTING_OWNER=0x...                     # optional owner (defaults to msg.sender)
VESTING_DESCRIPTION="Team unlock"       # optional free text

VESTING_START_TIMESTAMP=1718000000      # required; Unix seconds (TGE)
VESTING_CLIFF_DURATION_SECONDS=0        # optional; seconds from start to cliff (default 0)
VESTING_DURATION_SECONDS=0              # optional; linear duration after cliff (default 0)

# Amounts (pick ONE per line: human-readable OR raw base units)
VESTING_TOTAL_ALLOCATION=100000         # parsed with token decimals
VESTING_TOTAL_RAW=100000000000000000000 # alt: raw base units
VESTING_TGE_AMOUNT=10000                # optional; defaults to 0
VESTING_TGE_RAW=10000000000000000000
VESTING_LINEAR_AMOUNT=90000             # optional; defaults to 0
VESTING_LINEAR_RAW=90000000000000000000

DEPLOY=true                              # default when unset
VERIFY=false                             # set true to verify
```

**How amounts work**
- `totalAllocation` must be **>=** `tgeAmount + linearAllocation + Σ(tranches)`.
- When `durationSeconds = 0`, `linearAllocation` **must** be `0` (pure TGE and/or tranches).
- The script only wires TGE + linear; step-based tranches can be added later on the vesting wallet by the owner via `addTranche` / `addTranches`, then locked with `finalizeTranchesConfiguration`.

**Common schedules**
- **TGE only**: `durationSeconds=0`, `cliffDurationSeconds=0`, `linearAllocation=0`, `tgeAmount = totalAllocation`.
- **Cliffed linear**: `tgeAmount` (optional), `cliffDurationSeconds>0`, `durationSeconds>0`, `linearAllocation = totalAllocation - tgeAmount - Σ(tranches)` (Σ(tranches)=0 if you skip tranches).
- **Pure step-based**: `durationSeconds=0`, `linearAllocation=0`, choose any `tgeAmount`, then add tranches on the deployed wallet until `tge + Σ(tranches) = totalAllocation`, finalize, then release.
- **Mixed**: combine TGE + cliffed linear + future tranches; ensure totals balance before finalization.

**Combinations cheat-sheet**
- Instant TGE only: `tgeAmount = totalAllocation`, `linearAllocation = 0`, `durationSeconds = 0`.
- TGE + cliffed linear: `tgeAmount > 0`, `cliffDurationSeconds > 0`, `durationSeconds > 0`, `linearAllocation = totalAllocation - tgeAmount`.
- Linear with no TGE: `tgeAmount = 0`, `cliffDurationSeconds >= 0`, `durationSeconds > 0`, `linearAllocation = totalAllocation`.
- Linear starting immediately: `cliffDurationSeconds = 0`, `durationSeconds > 0`, `tgeAmount` optional.
- Step-only with optional TGE: `durationSeconds = 0`, `linearAllocation = 0`, pick `tgeAmount`, then add tranches so `tge + Σ(tranches) = totalAllocation`.
- Mixed (TGE + linear + tranches): pick any `tgeAmount`, set `linearAllocation`, leave the rest for tranches; totals must equal `totalAllocation`.

**Run**
```bash
yarn hardhat run scripts/mainnet-deployment/belong-checkin/14-deploy-vesting-wallet.ts --network <net>
```
Check `deployments/chainId-<id>.json` for the new entry (`vestingWallets[<index>]`) containing the vesting wallet address, token, beneficiary, and tx hash.

---

## Verification Tips

- Non-proxy contracts (libraries, LONG, Staking, BelongCheckIn, Escrow, credit tokens) verify the single deployed address.
- Proxy contracts (`Factory`) verify the proxy address; Hardhat handles proxy metadata.
- Re-run individual scripts with `VERIFY=true DEPLOY=false` if you only need verification.

---

## After Deployment

- Inspect the generated `deployments/chainId-<id>.json` to confirm addresses, parameters, and metadata.
- Keep `.env` and deployment files secure—they contain private configuration and derived data needed for future upgrades and liquidity operations.
