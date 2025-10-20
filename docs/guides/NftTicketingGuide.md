# NFT Ticketing – Deployment & Operations Guide

Hardhat scripts in `package.json` deploy and manage the legacy NFT factory stack (`contracts/v1`). Primary commands include:

- `deploy:factory` – Factory deployment and upgrades
- `deploy:nft_mock` – Reference NFT for testing or verification
- `deploy:access_token` – Deploy an AccessToken + RoyaltiesReceiver pair through the factory
- `verify:*` – Explorer verification helpers for factory, AccessTokens, and mocks

> ⚠️ Use **Node 18 or 20** with Hardhat. Example: `nvm use 20 && yarn install`.

---

## Prerequisites

- Node LTS (18/20) via `nvm`
  ```bash
  nvm use 20
  yarn install
  ```
- Hardhat toolchain (installed with the repo)
- `.env` populated with RPC credentials, deployer keys, and factory defaults
- Funded deployer wallet (EOA private key, mnemonic, or Ledger device)
- Optional explorer API keys (Etherscan, Blastscan, Polygonscan, etc.) for automated verification

---

## Environment Variables

Rename `.env.example` to `.env` and group values as follows:

```ini
# RPC / verification
INFURA_ID_PROJECT=<rpc-or-infura-id>
ETHERSCAN_API_KEY=<optional>
BLASTSCAN_API_KEY=<optional>
POLYSCAN_API_KEY=<optional>
CELOSCAN_API_KEY=<optional>
BASESCAN_API_KEY=<optional>
LINEASCAN_API_KEY=<optional>

# Deployer credentials (pick one path)
PK=<hex-private-key>
MNEMONIC="<twelve words>"
LEDGER_ADDRESS=0x...              # if using @nomicfoundation/hardhat-ledger

# Factory defaults
SIGNER_ADDRESS=0x...
PLATFORM_ADDRESS=0x...
PLATFORM_COMMISSION=200           # basis points (default 2%)
PAYMENT_CURRENCY=0x...            # optional ERC20; leave blank for native
MAX_ARRAY_SIZE=20                 # optional override
TRANSFER_VALIDATOR=0x...          # optional OpenSea validator address

# Referral overrides (optional)
REFERRAL_PERCENT_FIRST_TIME_USAGE=...
REFERRAL_PERCENT_SECOND_TIME_USAGE=...
REFERRAL_PERCENT_THIRD_TIME_USAGE=...
REFERRAL_PERCENT_DEFAULT=...

# Access token deployment (optional)
ACCESS_TOKEN_NAME="Example Pass"
ACCESS_TOKEN_SYMBOL=EXP
ACCESS_TOKEN_URI="ipfs://.../collection.json"
ACCESS_TOKEN_MINT_PRICE=10000000000000000   # 0.01 ETH
ACCESS_TOKEN_WHITELIST_PRICE=5000000000000000
ACCESS_TOKEN_PAYMENT_TOKEN=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
ACCESS_TOKEN_REFERRAL_CODE=0x00
ACCESS_TOKEN_FEE_NUMERATOR=600
ACCESS_TOKEN_MAX_TOTAL_SUPPLY=0
ACCESS_TOKEN_COLLECTION_EXPIRE=0
ACCESS_TOKEN_TRANSFERABLE=true
SIGNER_PK=<backend signer private key>
```

Explorer keys are only required when you intend to auto-verify on that chain. Blockscout-based explorers function without API keys.

---

## Deployment Workflow

### 1. Compile & Test

```bash
yarn compile
yarn test
# Optional coverage
yarn coverage
```

### 2. Deploy Factory (EOA or Ledger)

```bash
yarn deploy:factory <network>
```

Ledger deployments use the same command; prompts such as

```
✔️ [hardhat-ledger] Connecting wallet
✔️ [hardhat-ledger] Deriving address #10 (path "m/44'/60'/10'/0/0")
✔️ [hardhat-ledger] Waiting for confirmation
```

appear while awaiting on-device confirmation.

### 3. Deploy NFT Mock (optional)

```bash
yarn deploy:nft_mock <network>
```

### 4. Deploy Access Token (optional)

Use this when you want to roll out an AccessToken/RoyaltiesReceiver pair via the factory. It reads config from `.env` and records the result in `deployments/chainId-<id>.json`.

```bash
yarn deploy:access_token <network>
```

---

## Verification

Populate deployed addresses in `.env` before running verification scripts.

### Factory

```ini
NFT_FACTORY_ADDRESS=0x...
```

```bash
yarn verify:factory <network>
```

### NFT / Royalties Receiver

```ini
NFT_ADDRESS=0x...
NFT_CREATOR_ADDRESS=0x...
RECEIVER_ADDRESS=0x...
NFT_NAME="Example NFT"
NFT_SYMBOL=EXNFT
PAYING_TOKEN_ADDRESS=0x...        # 0x000...000 for native currency
FEE_NUMERATOR=500                 # 5%
TRANSFERRABLE=true
MAX_TOTAL_SUPPLY=1000
MINT_PRICE=10000000000000000      # 0.01 ETH
WHITELIST_MINT_PRICE=5000000000000000
COLLECTION_EXPIRE=0               # 0 to disable expiry
CONTRACT_URI="ipfs://.../metadata.json"
SIGNATURE=0x...
REFERRAL_CODE=0x...               # optional
```

```bash
yarn verify:deployed <network>
```

### NFT Mock

```ini
NFT_MOCK=0x...
```

```bash
yarn verify:nft_mock <network>
```

---

## Supported Networks

`<network>` accepts the same names across all scripts:

- `mainnet`, `sepolia`
- `bsc`
- `matic`, `amoy`
- `blast`, `blast_sepolia`
- `celo`
- `base`
- `linea`
- `astar`
- `arbitrum`
- `skale_europa`, `skale_nebula`, `skale_calypso`, `skale_calypso_testnet`

Ensure matching RPC endpoints are configured in `hardhat.config.ts`.

---

## Post-Deployment Checklist

- Archive the factory address and ABI for future upgrades.
- Protect the backend signer credentials—collection creation & minting rely on them.
- Smoke-test referral creation, collection deployment, and mint flows on each network before onboarding creators.
- Update [`docs/guides/NftTicketingOverview.md`](./NftTicketingOverview.md) if fee schedules or referral policies change.
