# BelongCheckIn – Deployment & Upgrade Guide

Hardhat scripts under `scripts/mainnet-deployment/belong-check-in` deploy, upgrade, and verify the BelongCheckIn ecosystem:

- Libraries: `SignatureVerifier`, `Helper`
- Implementations: `AccessToken`, `CreditToken`, `RoyaltiesReceiverV2`, `VestingWallet`
- Core: `Factory`, `LONG`, `Staking`, `BelongCheckIn`, `Escrow`, `VenueToken`, `PromoterToken`

Each script reads/writes `deployments/chainId-<id>.json` and optionally verifies contracts on the target explorer.

> ⚠️ Use **Node 18 or 20** with Hardhat. Example: `nvm use 20 && yarn install`.

---

## Prerequisites

- Node 18 or 20 via `nvm`
- Yarn (`npm i -g yarn`)
- Funded deployer wallet for the target network
- RPC endpoint (Infura/Alchemy/etc.)
- Explorer API key (Etherscan, Blastscan, Polyscan, ...)

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
   - Example: `DEPLOY=true VERIFY=true yarn hardhat run scripts/mainnet-deployment/belong-check-in/0-deploy-signature-verifier.ts --network sepolia`

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

9. **Escrow** – `7-deploy-escrow.ts`
   - Consumes the BelongCheckIn address and records `deployments.checkIn.escrow`.

10. **Credit Tokens** – `8-deploy-credit-tokens.ts`
    - Requires `SIGNER_PK` and `deployments.factory.proxy`.
    - Deploys VenueToken and PromoterToken through the factory and stores metadata.

11. **BelongCheckIn Wiring** – `9-set-checkin-up.ts`
    - Requires `LONG_PRICE_FEED` along with all addresses written in prior steps.
    - Calls `setContracts` on BelongCheckIn with Factory, Escrow, Staking, VenueToken, PromoterToken, and price feed addresses.

All scripts write back to `deployments/chainId-<id>.json` after every successful action.

---

## Verification Tips

- Non-proxy contracts (libraries, LONG, Staking, BelongCheckIn, Escrow, credit tokens) verify the single deployed address.
- Proxy contracts (`Factory`) verify the proxy address; Hardhat handles proxy metadata.
- Re-run individual scripts with `VERIFY=true DEPLOY=false` if you only need verification.

---

## After Deployment

- Inspect the generated `deployments/chainId-<id>.json` to confirm addresses, parameters, and metadata.
- Keep `.env` and deployment files secure—they contain private configuration and derived data needed for future upgrades.
