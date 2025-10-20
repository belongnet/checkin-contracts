# Token Gating Platform Overview

The token gating platform powers membership-style ERC-721 collections with programmable referral rewards and royalty routing. This guide outlines the core components, lifecycle, and operational considerations.

## Core Concepts

- **Factory-controlled deployments** – All collections are created through `NFTFactory.sol`, ensuring parameters pass platform review before minting.
- **Moderated metadata** – The backend signer approves every collection and mint via EIP-712 style signatures, safeguarding naming, pricing, and royalty configuration.
- **Referral incentives** – `ReferralSystem.sol` lets partners generate referral codes and earn a portion of platform commissions when creators deploy collections with their code.
- **Royalty routing** – `RoyaltiesReceiver.sol` splits secondary-sale revenue between creators and the platform using ERC-2981-compatible receivers.
- **Non-transferable mode** – Collections can be marked non-transferable at deployment, enabling access passes or membership credentials.

## Key Contracts

| Component | Purpose | Documentation |
|----------|---------|---------------|
| `Factory.sol` | Proxy-based factory that deploys new AccessToken collections with backend-approved parameters. | [`docs/contracts/v2/platform/Factory.md`](../contracts/v2/platform/Factory.md) |
| `ReferralSystemV2.sol` | Manages referral codes, fee splits, and affiliate relationships. | [`docs/contracts/v2/platform/extensions/ReferralSystemV2.md`](../contracts/v2/platform/extensions/ReferralSystemV2.md) |
| `AccessToken.sol` | ERC-721 implementation supporting signature-gated minting and configurable platform commissions. | [`docs/contracts/v2/tokens/AccessToken.md`](../contracts/v2/tokens/AccessToken.md) |
| `RoyaltiesReceiverV2.sol` | Custodian contract that receives and splits royalties between creator and platform. | [`docs/contracts/v2/periphery/RoyaltiesReceiverV2.md`](../contracts/v2/periphery/RoyaltiesReceiverV2.md) |
| `Structures.sol` | Shared structs (`NftMetadata`, `AccessTokenInfo`, etc.) used across the platform. | [`docs/contracts/v2/Structures.md`](../contracts/v2/Structures.md) |

Complementary utilities reside in [`docs/contracts/v2/utils`](../contracts/v2/utils) and common tooling under [`docs/contracts/utils`](../contracts/utils).

## Lifecycle Overview

1. **Collection approval**
   - Creator submits metadata (name, symbol, contractURI, pricing, royalty targets, referral code).
   - Backend validates the payload and signs the creation request.
   - `NFTFactory.produce` deploys the collection via proxy, wiring platform fees and royalty receivers.

2. **Minting**
   - Each mint request is pre-approved server-side, generating a signed payload with mint price, token URI, whitelist flag, and payment token.
   - The AccessToken contract verifies the signature, collects funds, and splits proceeds between platform and creator.

3. **Royalties & referrals**
   - Secondary sales pay into `RoyaltiesReceiver`, which forwards funds according to the platform/creator split.
   - When a referral code is attached, the code owner receives a portion of platform commissions on primary sales.

4. **Administration**
   - Platform owners can adjust commissions, signer address, platform wallet, and transfer validators through `NFTFactory`.
   - Creators may update mint prices, payment tokens, and optionally mark collections non-transferable at deployment (immutable once set).

## Deployment & Tooling

- Hardhat scripts under `scripts/mainnet-deployment/nft-ticketing` automate factory deployment, mock AccessToken deployment, and production AccessToken rollout.
- Refer to [`docs/guides/HardHat.md`](./HardHat.md) for general workspace commands and [`docs/contracts/interfaces`](../contracts/interfaces) for validator ABIs.

## When to Use

Adopt the token gating platform when you need:

- Curated ERC-721 membership or access passes with backend moderation.
- Referral revenue sharing on primary sales.
- Configurable royalty payout routing and non-transferable options.

For venue marketing and credit-token-based rewards, use the Belong CheckIn platform instead (see [`docs/guides/BelongCheckinOverview.md`](./BelongCheckinOverview.md)).

## Proxy Deployment Architecture

The factory stack uses the OpenZeppelin proxy pattern:

1. Deploy the implementation contract.
2. Deploy the proxy contract.
3. Deploy a `ProxyAdmin` to manage proxies.
4. Wire the implementation to the proxy via `ProxyAdmin` and initialize with a `delegatecall`.

Subsequent upgrades or new deployments should continue to use the stored `ProxyAdmin`.

## Roles and Permissions

- **Owner** – Configures platform commission, platform wallet, signer address, and global parameters via `NFTFactory`.
- **Creator** – Supplies collection metadata, sets pricing and payment tokens, and receives primary-sale plus royalty proceeds.
- **Platform address** – Collects its commission share from primary sales and royalties.
- **Signer (backend)** – Issues EIP-712 signatures for collection creation and minting.
- **User** – Launches collections (with approval), mints tokens, and can participate in referrals.

## Feature Highlights

- Signature-gated collection creation and minting.
- Optional non-transferable collections for access passes.
- Support for static and dynamic mint pricing.
- Referral codes that share platform revenue with partners.
- Native or ERC-20 payment support with automatic commission splits.

## Detailed Collection Lifecycle

### Creation
1. Creator submits name, symbol, contractURI, pricing, royalty split, payment token, transferability flag, and optional referral code.
2. Backend validates/approves and signs the payload.
3. `NFTFactory.produce` deploys the collection and associated royalty receiver.

### Referral Attachment
1. Any user can create a referral code via `ReferralSystem`.
2. Creator supplies the code when deploying the collection.
3. The code owner receives their configured share of platform commissions from primary mints.

### Minting
1. User requests a mint; backend checks eligibility (whitelist flag, price, URI).
2. Backend signs the mint payload.
3. User calls the mint function with the signature. The contract verifies input, processes payment, and mints the token.

### Payment Handling

- If `mintPrice > 0`, the contract accepts either native currency or an ERC-20 payment token.
- Platform commission is collected immediately; the remainder goes to the creator.
- Referral partners receive their share of the platform commission.

### Royalties

Secondary-market royalties are routed through `RoyaltiesReceiver` using the formula:

```
platformShares = 10000 / (x / p + 1)
creatorShares  = 10000 - platformShares
```

Where `x` is the creator royalty basis points and `p` is the platform fee basis points (default 100).

## Technical Reference

- Static pricing flow: ![StaticPrice](../pics/Diagram1.png)
- Dynamic pricing flow: ![DynamicPrice](../pics/Diagram2.jpg)
- Referral system diagram: ![ReferralSystem](../pics/ReferralSystem.png)
- Royalties receiver flow: ![RoyaltiesReceiver](../pics/ReceiverFactory_schema.png)

Refer to `scripts/mainnet-deployment/nft-ticketing/*` for Hardhat automation details, and see [`docs/guides/HardHat.md`](./HardHat.md) for workspace setup instructions.

## Commission & Treasury Notes

- Each collection inherits `platformCommission` and `platformAddress` from `NFTFactory` during minting.
- When `mintPrice` or royalties are non-zero, deploy a dedicated `RoyaltiesReceiver`; otherwise the creator wallet acts as the fee receiver.
- Non-transferable collections must set the flag at deployment; it cannot be changed later.
