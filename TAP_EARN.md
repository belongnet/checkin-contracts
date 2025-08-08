# README: Deployment Script for TapAndEarn Ecosystem Contracts

This script is a comprehensive Hardhat deployment tool for deploying and verifying a suite of smart contracts in the TapAndEarn ecosystem, including Helper, SignatureVerifier, LONG, TapAndEarn, Escrow, and Staking. It uses environment variables for configuration, deploys contracts in a specific order (handling dependencies like using deployed addresses in subsequent deployments), saves deployment details to a JSON file, and optionally verifies contracts on Etherscan (or similar explorers).

The script assumes you're deploying to an Ethereum-compatible network (e.g., Sepolia testnet, chain ID 11155111, based on common usage). It handles directory creation for deployments and includes validation for addresses and values.

## Prerequisites

1. **Node.js and Yarn**:
   - Use Node.js LTS version (e.g., v18 or v20). Avoid v23+ as it's unsupported by Hardhat and may cause issues like `secp256k1 unavailable`.
   - Install with `nvm` (recommended):

```
nvm install 18
nvm use 18
```

- Install Yarn: `npm install -g yarn`.

2. **Dependencies**:

Run `yarn install` to install all project dependencies.
Ensure your `package.json` includes necessary libraries (e.g., `dotenv`, `fs`).

3. Wallet and Funds:

Have an Ethereum wallet with testnet ETH (e.g., Sepolia ETH from a faucet like Alchemy's Sepolia Faucet) for gas fees.
Export its private key securely (never commit it).

4. API Keys:

Alchemy (or Infura) for RPC URL.
Etherscan for contract verification.

5. Dependencies:

Run yarn install to install all project dependencies.
Ensure your package.json includes necessary libraries (e.g., dotenv, fs).

6. Wallet and Funds:

Have an Ethereum wallet with testnet ETH (e.g., Sepolia ETH from a faucet like Alchemy's Sepolia Faucet) for gas fees.
Export its private key securely (never commit it).

7. API Keys:

Alchemy (or Infura) for RPC URL.
Etherscan for contract verification.

## Setup

1. Create `.env` File:

In your project root, create a `.env` file and add the following variables. Replace placeholders with actual values.

Required for All Deployments:

```
# Network and Verification
INFURA_ID_PROJECT=your-infura-api-key-here
PK=your-wallet-private-key-here  # Deployer's private key (with ETH for gas)
LEDGER_ADDRESS
ETHERSCAN_API_KEY=your-etherscan-api-key-here  # For contract verification
BLASTSCAN_API_KEY
POLYSCAN_API_KEY

# LONG Contract
MINT_LONG_TO=0xYourMintToAddress  # Address to mint initial LONG tokens to
LONG_AMOUNT_TO_MINT=1000000  # Amount of LONG tokens to mint (integer)
ADMIN_ADDRESS=0xYourAdminAddress  # Admin role address (used as owner in multiple contracts)
PAUSER_ADDRESS=0xYourPauserAddress  # Pauser role address for LONG

# TapAndEarn Contract (PaymentsInfo)
UNISWAPV3_POOL_FEES=3000  # Uniswap V3 pool fee tier (e.g., 3000 for 0.3%)
UNISWAPV3_ROUTER_ADDRESS=0xE592427A0AEce92De3Edee1F18E0157C05861564  # Uniswap V3 Router (Sepolia example)
UNISWAPV3_QUOTER_ADDRESS=0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6  # Uniswap V3 Quoter (Sepolia example)
WETH_ADDRESS=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14  # WETH address (Sepolia example)
USDC_ADDRESS=0xYourUSDCAddress  # USDC token address on the network

# Staking Contract
TREASURY_ADDRESS=0xYourTreasuryAddress  # Treasury address for Staking

# TapAndEarn Setup (setContracts call)
FACTORY=0xYourFactoryAddress  # Factory contract address
VENUE_TOKEN=0xYourVenueTokenAddress  # Venue token address
PROMOTER_TOKEN=0xYourPromoterTokenAddress  # Promoter token address
LONG_PRICE_FEED=0xYourLongPriceFeedAddress  # LONG price feed (e.g., Chainlink oracle)
```

Notes:

Addresses must be valid Ethereum addresses (prefixed with `0x`).
For testnets like Sepolia, use testnet-specific addresses (e.g., Uniswap V3 contracts).
Add `.env` to `.gitignore` to avoid committing sensitive data.

2. Script Location:

Save the script as `deploy-all.ts` in your project's `scripts/` directory (e.g., `scripts/deploy-all.ts`).

## Usage

1. Run the Script:

Deploy to a specific network (e.g., Sepolia):

```
yarn hardhat run scripts/deploy-all.ts --network sepolia
```

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

2. Toggle Deployment/Verification:

Set DEPLOY = false to skip deployment (useful for verification only).
Set VERIFY = false to skip verification.

3. View Deployment Data:

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

## Troubleshooting

Node.js Version Issues: If you see warnings about unsupported Node.js, switch versions with nvm and reinstall dependencies (yarn install).
Missing Env Variables: Ensure all required keys are in .env. The script will throw errors if any are missing.
Deployment Failures: Check gas funds, network connection, or contract logic in deployFixtures/deployLibraries.
Verification Failures: Verify your ETHERSCAN_API_KEY and ensure the contract was deployed successfully.
Custom Networks: Add networks to hardhat.config.ts as needed (e.g., mainnet).

For issues, check Hardhat docs or provide error logs for debugging.
