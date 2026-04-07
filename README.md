# Belong Starknet NFT Contracts

This repository contains the Cairo/Starknet implementation of Belong's NFT factory system. A backend-approved creator can deploy NFT collections through a factory, mint tokens with SNIP-12 signed payloads, and optionally route royalty payouts through a dedicated receiver contract.

## Project Status

The current repository is a Starknet project built with Cairo 2, Scarb, Starkli, and Starknet Foundry.

Older EVM/Hardhat-oriented text that previously lived in this repository is no longer the correct mental model for the code under `src/`. The authoritative implementation is the Cairo code in this repo.

## Architecture

- `NFTFactory` in `src/nftfactory/nftfactory.cairo`
  - Stores global platform configuration.
  - Verifies backend signatures for collection deployment.
  - Manages referral codes and referral payouts.
  - Deploys `NFT` and, when needed, `Receiver`.
- `NFT` in `src/nft/nft.cairo`
  - Represents a single collection.
  - Stores payment settings, supply limits, and transferability.
  - Supports static-price and dynamic-price batch minting.
- `Receiver` in `src/receiver/receiver.cairo`
  - Distributes ERC20 royalty proceeds between creator, platform, and optional referral beneficiary.
- `snip12` modules in `src/snip12/`
  - Build the typed hashes used by the backend signer and validated onchain.

## Repository Layout

- `src/` Cairo contracts, interfaces, utilities, mocks, and tests.
- `scripts/` TypeScript helpers for SNIP-12 messages and example signing flows.
- `docs/config/` setup, declaration, deployment, and tooling guides.
- `docs/contracts/` high-level documentation for the active Cairo contracts.
- `pics/` legacy diagrams used by the docs.

## Requirements

- `scarb 2.14.0`
- `starknet-foundry 0.51.1`
- `starkli`
- `node` and `yarn` for the helper scripts
- A deployed Starknet account funded on the target network

Version-pinned local tooling is listed in [`.tool-versions`](./.tool-versions).

Initial environment setup lives here:

- [Environment Setup](./docs/config/EnvSetUp.md)
- [Account Setup](./docs/config/AccountSetUp.md)

## Install

Use `yarn` only for the TypeScript helpers. Contract build and tests run through Scarb and Starknet Foundry.

```bash
yarn install
scarb build
```

## Common Commands

- Build contracts: `scarb build`
- Run tests: `scarb test`
- Run tests directly with Foundry: `snforge test`
- Format Cairo and TypeScript files: `scarb run format`
- Print sample SNIP-12 produce hash: `scarb run produce-message`
- Print sample static-price hash: `scarb run static-price-message`
- Print sample dynamic-price hash: `scarb run dynamic-price-message`
- Run the example signature script: `npx tsx scripts/produce-signature.ts`

If you use `scripts/produce-signature.ts`, set `PROVIDER`, `ADDRESS`, and `PK` in `.env` first. The script is an example template and should be adjusted to the actual payload you want to sign.

## Deployment Flow

1. Configure Starkli and your account.
   - Follow [Environment Setup](./docs/config/EnvSetUp.md) and [Account Setup](./docs/config/AccountSetUp.md).
2. Build and declare the contract classes.
   - See [Declaring Belong Contracts](./docs/config/DeclaringSC.md).
3. Deploy the `NFTFactory` contract with the owner address.
4. Initialize `NFTFactory` with:
   - `NFT` class hash
   - `Receiver` class hash
   - Backend signer account
   - Default payment token
   - Platform address
   - Platform commission
   - Max mint batch size
   - Referral percentage table
5. Have the backend sign a `ProduceHash` payload and call `NFTFactory.produce(...)` to deploy a collection.
6. Mint through `mintStaticPrice(...)` or `mintDynamicPrice(...)` using SNIP-12 signed payloads.

The detailed deployment walkthrough is in [Deploying Belong Contracts](./docs/config/DeployingSC.md).

## Important Behavior

- Mint payments are ERC20-only in the current Cairo implementation. `NFT` and `Receiver` use `IERC20Dispatcher`; native ETH handling is not implemented here.
- `Receiver` is deployed only when `royalty_fraction > 0`.
- If `InstanceInfo.payment_token` is zero, `NFTFactory` falls back to `FactoryParameters.default_payment_currency`.
- Collection uniqueness is enforced by the hash of `(name, symbol)`.
- The `transferrable` flag is checked on transfer and becomes collection-wide behavior after deployment.
- `NFT` and `NFTFactory` expose `upgrade()` through OpenZeppelin Cairo's `UpgradeableComponent`.
- `NFT.contractUri()` returns the stored contract URI hash, not the raw URI string.

## Docs Index

- [Declaring Belong Contracts](./docs/config/DeclaringSC.md)
- [Deploying Belong Contracts](./docs/config/DeployingSC.md)
- [Starknet Foundry Notes](./docs/config/SNFoundry.md)
- [NFTFactory](./docs/contracts/factories/NFTFactory.md)
- [NFT](./docs/contracts/NFT.md)
- [Royalties Receiver](./docs/contracts/RoyaltiesReceiver.md)
- [Core Cairo Structures](./docs/contracts/Structures.md)

## Source References

- `src/nftfactory/nftfactory.cairo`
- `src/nft/nft.cairo`
- `src/receiver/receiver.cairo`
- `src/snip12/produce_hash.cairo`
- `src/snip12/static_price_hash.cairo`
- `src/snip12/dynamic_price_hash.cairo`
