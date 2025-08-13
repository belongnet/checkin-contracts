# TapAndEarn – Deployment & Upgrade Guide

This repo ships a set of Hardhat scripts to **deploy, upgrade, and verify** the TapAndEarn ecosystem:

- Libraries: `Helper`, `SignatureVerifier`
- Implementations: `AccessToken`, `CreditToken`, `RoyaltiesReceiverV2`
- Core: `LONG`, `Staking`, `TapAndEarn`, `Escrow`
- Factory upgrade from legacy → new `Factory`

The scripts also **persist addresses** under `deployments/chainId-<id>.json` and can **verify** contracts.

> ⚠️ Use **Node 18 or 20**. Hardhat doesn’t support Node 23+.  
> `nvm use 20 && yarn install`

---

## 🧰 Prerequisites

- **Node**: v18 or v20 via `nvm`
- **Yarn**: `npm i -g yarn`
- **Funds**: your deployer wallet has test ETH (Sepolia, etc.)
- **API keys**: RPC (Infura/Alchemy) + Etherscan-like explorer API key
- **Hardhat plugins**: already included via `yarn install`

---

## 🔐 Environment

Create `.env` (never commit):

```ini
# RPC / keys
INFURA_ID_PROJECT=<...>          # or ALCHEMY_*
ETHERSCAN_API_KEY=<...>          # explorer verification
BLASTSCAN_API_KEY=<...>          # optional per-chain
POLYSCAN_API_KEY=<...>           # optional per-chain
PK=<deployer-private-key>        # or configure accounts in hardhat.config
LEDGER_ADDRESS=<your-ledger>     # optional label only

# LONG
MINT_LONG_TO=0x...
ADMIN_ADDRESS=0x...
PAUSER_ADDRESS=0x...

# TapAndEarn (PaymentsInfo)
UNISWAPV3_POOL_FEES=3000
UNISWAPV3_ROUTER_ADDRESS=0xE592427A0AEce92De3Edee1F18E0157C05861564
UNISWAPV3_QUOTER_ADDRESS=0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6
WETH_ADDRESS=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
USDC_ADDRESS=0x...

# Staking
TREASURY_ADDRESS=0x...

# Factory upgrade (you must already have a proxy deployed)
FACTORY=0x<existing-factory-proxy>

# After you deploy Venue/Promoter tokens & price feed, add:
VENUE_TOKEN=0x...
PROMOTER_TOKEN=0x...
LONG_PRICE_FEED=0x...
```

🗂️ Deployments index file

All scripts read/write deployments/chainId-<id>.json.
Important: the key for the verifier library is SignatureVerifier (spelled correctly). If you previously saved SigantureVerifier, fix it in your JSON.

Minimal example:

```
{
  "SignatureVerifier": { "address": "0x..." },
  "AccessTokenImplementation": { "address": "0x..." },
  "RoyaltiesReceiverV2Implementation": { "address": "0x..." },
  "CreditTokenImplementation": { "address": "0x..." },
  "Factory": { "proxy": "0x...", "implementation": "0x..." },
  "Helper": { "address": "0x..." },
  "LONG": { "address": "0x...", "parameters": ["0xMintTo","0xAdmin","0xPauser"] },
  "Staking": { "address": "0x...", "parameters": ["0xOwner","0xTreasury","0xLONG"] },
  "TapAndEarn": { "address": "0x...", "parameters": ["0xOwner", { "uniswapPoolFees": 3000, "...": "..." }] },
  "Escrow": { "address": "0x...", "parameters": ["0xTapAndEarn"] }
}

```

> Note: For TapAndEarn and other non-proxy deployments, the field is address (not proxy). Keep it consistent or your later scripts will fail.

🚀 Deployment & Upgrade Order

> You can toggle behavior per-step with env flags:
```
DEPLOY=true|false
VERIFY=true|false
UPGRADE=true|false
```
> Run each step with your target network, e.g. --network sepolia.

## Deployment

1. SignatureVerifier:

Run:
```
DEPLOY=true VERIFY=true yarn hardhat run scripts/mainnet-deployment/tap-earn/0-deploy-signature-verifier.ts --network <network sepcified>
```

This writes:
```
"SignatureVerifier": { "address": "0x..." }
```

2. Implementations:

Run:
```
DEPLOY=true VERIFY=true yarn hardhat run scripts/mainnet-deployment/tap-earn/1-deploy-implementations.ts --network <network sepcified>
```

Writes:
```
"AccessTokenImplementation": { "address": "0x..." },
"RoyaltiesReceiverV2Implementation": { "address": "0x..." },
"CreditTokenImplementation": { "address": "0x..." }
```

3. Upgrade Factory:

Required fields in `.env`: 
```
FACTORY=0xYourFactoryAddress  # Factory contract address
```

Factory should be upgraded to the new version related to the changes.

Run:
```
UPGRADE=true VERIFY=true yarn hardhat run scripts/mainnet-deployment/tap-earn/2-upgrade-factory.ts --network <network sepcified>
```

4. LONG:

Required fields in `.env`: 
```
MINT_LONG_TO=0xYourMintToAddress  # Address to mint initial LONG tokens to
ADMIN_ADDRESS=0xYourAdminAddress  # Admin role address (used as owner in multiple contracts)
PAUSER_ADDRESS=0xYourPauserAddress  # Pauser role address for LONG
```


Run:
```
DEPLOY=true VERIFY=true yarn hardhat run scripts/mainnet-deployment/tap-earn/3-deploy-LONG.ts --network <network sepcified>
```

5. Staking

Required fields in `.env`: 
```
TREASURY_ADDRESS=0xYourTreasuryAddress  # Treasury address for Staking
ADMIN_ADDRESS=0xYourAdminAddress  # Admin role address (used as owner in multiple contracts)
```

Run:
```
DEPLOY=true VERIFY=true yarn hardhat run scripts/mainnet-deployment/tap-earn/4-deploy-staking.ts --network <network sepcified>
```

7. Helper:

Run:
```
DEPLOY=true VERIFY=true yarn hardhat run scripts/mainnet-deployment/tap-earn/5-deploy-helper.ts --network <network sepcified>
```

7. TapAndEarn:

Required fields in `.env`:

```
UNISWAPV3_POOL_FEES=3000  # Uniswap V3 pool fee tier (e.g., 3000 for 0.3%)
UNISWAPV3_ROUTER_ADDRESS=0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E  # Uniswap V3 Router (Sepolia example)
UNISWAPV3_QUOTER_ADDRESS=0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3  # Uniswap V3 Quoter (Sepolia example)
WETH_ADDRESS=0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9  # WETH address (Sepolia example)
USDC_ADDRESS=0xf08A50178dfcDe18524640EA6618a1f965821715  # USDC token address on the network
```

Run:
```
DEPLOY=true VERIFY=true yarn hardhat run scripts/mainnet-deployment/tap-earn/6-deploy-tap-earn.ts --network <network sepcified>
```

8. Escrow:

Run:
```
DEPLOY=true VERIFY=true yarn hardhat run scripts/mainnet-deployment/tap-earn/7-deploy-escrow.ts --network <network sepcified>
```

9. VenueToken, CreditToken:

For their deployment Signer Backend should sing a message for its deployment. After their deployments, addresses should be added to `.env` file:
```
VENUE_TOKEN=0xYourVenueTokenAddress  # Venue token address
PROMOTER_TOKEN=0xYourPromoterTokenAddress  # Promoter token address
```

10. TapAndEarn configuration:

Required fields in `.env`:
```
VENUE_TOKEN=0x...
PROMOTER_TOKEN=0x...
LONG_PRICE_FEED=0x...
```

Run:
```
DEPLOY=true VERIFY=true yarn hardhat run scripts/mainnet-deployment/tap-earn/8-set-tapearn-up.ts --network <network sepcified>
```

🔎 Verification

- For non-proxy deployments (e.g., LONG, Staking, libs): verify the contract address.

- For proxy deployments: verify the implementation address (Etherscan has proxy-awareness, but verifying the impl directly is most reliable).

Your scripts already call `verifyContract(...)` appropriately; ensure they pass the implementation for proxies.

What Happens:

The script checks and validates all required environment variables.
Deploys contracts in order: Helper → SignatureVerifier → LONG → TapAndEarn → Escrow → Staking.
Uses deployed addresses (e.g., LONG in TapAndEarn, TapAndEarn in Escrow).
Calls `setContracts` on TapAndEarn to configure it with Factory, Escrow, Staking, etc.
Saves all addresses and parameters to `deployments/chainId-<chainId>.json` (e.g., `deployments/chainId-11155111.json`).
If `VERIFY = true`, verifies each contract on Etherscan.

Output Example:

```
For LONG deployment:
Everything specified!
For TapAndEarn deployment:
Everything specified!
For Staking deployment:
Everything specified!
For TapAndEarn configuration:
Everything specified!
Deploying Helper contract...
Deployed Helper to: 0x...
Deploying SignatureVerifier contract...
Deployed SignatureVerifier to: 0x...
Deploying LONG contract...
Deployed LONG to: 0x...
Deploying TapAndEarn contract...
Deployed TapAndEarn to: 0x...
Deploying Escrow contract...
Deployed Escrow to: 0x...
Deploying Staking contract...
Deployed Staking to: 0x...
Setting up TapAndEarn contract...
All deployments done.
Verification:
Helper verification successful.
...
Done.
```

2. View Deployment Data:

After running, check `deployments/chainId-<chainId>.json` for addresses and parameters:

```
{
  "Helper": { "address": "0x..." },
  "SignatureVerifier": { "address": "0x..." },
  "LONG": { "address": "0x...", "parameters": ["0x...", "1000000", "0x...", "0x..."] },
  "TapAndEarn": { "address": "0x...", "parameters": ["0x...", "0x...", "0x...", { "uniswapPoolFees": 3000, ... }] },
  "Escrow": { "address": "0x...", "parameters": ["0x..."] },
  "Staking": { "address": "0x...", "parameters": ["0x...", "0x...", "0x..."] }
}
```