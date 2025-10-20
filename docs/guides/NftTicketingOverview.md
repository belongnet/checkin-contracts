# NFT Ticketing (Legacy Factory Stack)

This guide summarizes the legacy NFT ticketing system that predates the Belong CheckIn platform. It focuses on the v2 factory contracts under `contracts/v2` and explains how creators launch invite-only collections, route royalties, and integrate referral rewards.

## Core Concepts

- **Factory-controlled deployments** – All ERC-721 collections are created through `NFTFactory.sol`, ensuring parameters pass platform review before minting.
- **Moderated metadata** – The backend signer approves every collection and mint via EIP-712 style signatures, safeguarding naming, pricing, and royalty config.
- **Referral incentives** – `ReferralSystem.sol` lets users generate referral codes and earn a share of platform commissions when creators deploy collections with their code.
- **Royalties routing** – `RoyaltiesReceiver.sol` splits secondary-sale revenue between creators and the platform using ERC-2981-compatible receivers.
- **Non-transferable mode** – Collections can be deployed with non-transferability enforced at mint time, useful for invite passes or membership credentials.

## Key Contracts

| Contract | Purpose | Documentation |
|----------|---------|---------------|
| `contracts/v2/platform/Factory.sol` | Proxy-based factory that deploys new ERC-721 collections with backend-approved parameters. | [`docs/contracts/v2/platform/Factory.md`](../contracts/v2/platform/Factory.md) |
| `contracts/v2/platform/extensions/ReferralSystemV2.sol` | Manages referral codes, fee splits, and affiliate relationships. | [`docs/contracts/v2/platform/extensions/ReferralSystemV2.md`](../contracts/v2/platform/extensions/ReferralSystemV2.md) |
| `contracts/v2/tokens/AccessToken.md` | Base ERC-721 implementation supporting signature-gated minting and configurable platform commissions. | [`docs/contracts/v2/tokens/AccessToken.md`](../contracts/v2/tokens/AccessToken.md) |
| `contracts/v2/periphery/RoyaltiesReceiverV2.md` | Custodian contract that receives and splits ERC-2981 royalties between creator and platform. | [`contracts/v2/periphery/RoyaltiesReceiverV2.md`](../contracts/v2/periphery/RoyaltiesReceiverV2.md) |
| `contracts/v2/Structures.sol` | Shared structs (`NftMetadata`, `AccessTokenInfo`, etc.) used across the factory stack. | [`docs/contracts/v2/Structures.md`](../contracts/v2/Structures.md) |

Complementary utilities reside in [`docs/contracts/v2/utils`](../contracts/v2/utils) (e.g., validation helpers) and common tooling under [`docs/contracts/utils`](../contracts/utils).

## Lifecycle Overview

1. **Collection approval**
   - Creator submits desired metadata (name, symbol, contractURI, pricing, royalty targets, referral code).
   - Backend verifies compliance and signs the creation payload.
   - `NFTFactory.produce` deploys the collection via proxy, wiring platform fees and royalty receivers.

2. **Minting**
   - Each mint request is pre-approved server-side, producing a signed payload that encodes mint price, token URI, whitelist flag, and paying token.
   - The NFT contract checks the signature, charges the correct currency, and distributes platform + creator proceeds.

3. **Royalties & referrals**
   - Secondary sales forward royalties to `RoyaltiesReceiver`, which releases funds according to predetermined platform/creator shares.
   - When a collection was launched with a referral code, the affiliate receives a programmable portion of platform commissions on primary sales.

4. **Administration**
   - Platform owner can update commissions, signer address, platform wallet, and validator integrations through `NFTFactory`.
   - Creators may adjust mint prices, payment tokens, and optionally disable transfers at deployment time (irreversible).

## Deployment & Tooling

- Hardhat scripts under `scripts/mainnet-deployment/nft-factory` (if present) handle deterministic deployments and upgrades of the factory stack.
- Refer to [`docs/guides/HardHat.md`](./HardHat.md) for workspace commands and [`docs/contracts/interfaces`](../contracts/interfaces) for validator ABI references.

## When to Use

Use the legacy NFT ticketing stack when you need:

- Curated ERC-721 drops with backend moderation.
- Invite passes or membership tokens tied to a hub/community.
- Simple referral revenue sharing on primary sales.
- Configurable royalty payout routing without the broader check-in mechanics.

For venue marketing, promoter rewards, or credit-token-based accounting, migrate to the Belong CheckIn platform instead.

## Proxy Deployment Architecture

The factory stack uses the OpenZeppelin proxy pattern:

1. Deploy the implementation contract (logic).
2. Deploy the proxy contract.
3. Deploy a `ProxyAdmin` to own the proxy instances.
4. Wire the implementation to the proxy via `ProxyAdmin` and call the initializer through `delegatecall`.

All subsequent upgrades or new deployments should be mediated by the stored `ProxyAdmin` address.

## Roles and Permissions

- **Owner** – Configures platform commission, platform wallet, signer address, and other global parameters via `NFTFactory`.
- **Creator** – Provides collection metadata, sets mint prices and accepted payment tokens, and receives primary-sale proceeds plus royalty shares.
- **Platform address** – Collects platform commissions from primary sales and a share of ERC-2981 royalties.
- **Signer (backend)** – Approves collection creation and individual mints by issuing EIP-712 style signatures.
- **User** – Launches collections (with approval), mints tokens, and can participate in referrals.

## Feature Highlights

- Signature-gated collection creation and minting.
- Transferability flag fixed at deployment time (supports non-transferable passes).
- Supports static and dynamic mint pricing.
- Referral codes that share platform revenue with community promoters.
- Native or ERC-20 payment support with automatic commission splits.

## Detailed Collection Lifecycle

### Creation
1. Creator submits name, symbol, contractURI, pricing, royalty distribution, payment token, transferability flag, and optional referral code.
2. Backend validates metadata, ensures royalty splits are within policy, and signs the creation payload.
3. `NFTFactory.produce` deploys a new collection contract via proxy and connects associated royalty receivers.

### Referral Attachment
1. Any user can create a referral code through `ReferralSystem`.
2. Creator supplies the referral code during collection creation.
3. The code’s owner receives a configurable portion of platform commissions from primary mints.

### Minting
1. User requests a mint; backend confirms eligibility (whitelist flag, price, tokenURI).
2. Backend signs the mint payload (includes payment token, mint price, URI, whitelist bit).
3. User calls the collection’s mint function supplying the signature. The contract verifies the signature, charges the correct amount, splits proceeds, and mints the token.

### Payment Handling

- If `mintPrice > 0`, the contract accepts either native currency or an approved ERC-20 token.
- Platform commission is carved out immediately; the remainder is forwarded to the creator.
- Referral participants receive their share from the platform commission portion.

### Royalties

Secondary-market royalties are routed through `RoyaltiesReceiver`, which enforces the creator/platform split:

```
platformShares = 10000 / (x / p + 1)
creatorShares  = 10000 - platformShares
```

Where `x` is the creator royalty basis points specified on the frontend and `p` is the platform fee basis points (default 100).

## Technical Reference

- Static pricing flow: ![StaticPrice](../pics/Diagram1.png)
- Dynamic pricing flow: ![DynamicPrice](../pics/Diagram2.jpg)
- Referral system diagram: ![ReferralSystem](../pics/ReferralSystem.png)
- Royalties receiver flow: ![RoyaltiesReceiver](../pics/ReceiverFactory_schema.png)

Refer to `scripts/mainnet-deployment/nft-factory/*` (if present) for Hardhat automation, and use [`docs/guides/HardHat.md`](./HardHat.md) for workspace setup instructions.

## Commission & Treasury Notes

- Each collection inherits `platformCommission` and `platformAddress` from `NFTFactory` during minting. Primary sales automatically split proceeds according to these values.
- ERC-2981 royalties do not affect on-chain logic unless marketplaces honor the interface; `RoyaltiesReceiver` simply routes incoming funds according to the platform/creator share formula above.
- Treasury creation guidelines:
  1. `mintPrice = 0` and `royalties = 0` → treasury uses the creator wallet as `feeReceiver`.
  2. `mintPrice > 0` or `royalties > 0` → deploy a dedicated `RoyaltiesReceiver` via `ReceiverFactory`.
- Non-transferable collections must set the flag at deployment; it cannot be toggled later.
