# Belong CheckIn Platform Overview

Belong CheckIn (contracts under `contracts/v2`) powers venue-based referral marketing where deposits, customer visits, and promoter payouts are tracked on-chain. This guide outlines the moving pieces, signature requirements, and supporting documentation for integrators.

## Core Concepts

- **Credit token accounting** – Venues pre-fund USDC deposits that mint ERC‑1155 “venue credits”. Promoter credits are minted on visits and burned on settlement, preventing double spending.
- **Signature-gated actions** – All external flows are authorized off-chain by the platform signer and revalidated on-chain, keeping the backend in control of venue settings, check-ins, and payouts.
- **Escrow & swaps** – Funds remain in `Escrow` until released; Uniswap V3 swaps handle LONG↔USDC conversions for customer subsidies, promoter payouts, and buyback/burn routines.
- **Tiered economics** – Staking balances determine deposit fees, convenience charges, and promoter payout haircuts, aligning incentives for heavy LONG holders.
- **Composable payment options** – Venues can accept USDC and/or LONG, choose how LONG payments are routed (auto-stake/auto-convert/direct), and optionally enable promoter bounty types (visit/spend/both).

## Contract Map

| Component | Description | Docs |
|-----------|-------------|------|
| `contracts/v2/platform/BelongCheckIn.sol` | Main coordinator for deposits, check-ins, payouts, and revenue routing. | [`docs/contracts/v2/platform/BelongCheckIn.md`](../contracts/v2/platform/BelongCheckIn.md) |
| `contracts/v2/platform/Factory.sol` | Holds signer configuration, emits deployment parameters, and provides access to platform addresses. | [`docs/contracts/v2/platform/Factory.md`](../contracts/v2/platform/Factory.md) |
| `contracts/v2/periphery/Escrow.sol` | Custodies venue deposits and releases funds to venues/promoters based on instructions from BelongCheckIn. | [`docs/contracts/v2/periphery/Escrow.md`](../contracts/v2/periphery/Escrow.md) |
| `contracts/v2/periphery/Staking.sol` | Records LONG staking balances to determine fee tiers. | [`docs/contracts/v2/periphery/Staking.md`](../contracts/v2/periphery/Staking.md) |
| `contracts/v2/tokens/CreditToken.sol` | ERC-1155 implementation for venue and promoter credit balances. | [`docs/contracts/v2/tokens/CreditToken.md`](../contracts/v2/tokens/CreditToken.md) |
| `contracts/v2/Structures.sol` | Shared structs/enums (`VenueRules`, `CustomerInfo`, etc.). | [`docs/contracts/v2/Structures.md`](../contracts/v2/Structures.md) |
| `contracts/v2/utils/SignatureVerifier.sol` | Hashing + signature validation helpers. | [`docs/contracts/v2/utils/SignatureVerifier.md`](../contracts/v2/utils/SignatureVerifier.md) |

## Roles & Responsibilities

- **Platform Owner** – Manages global parameters via `BelongCheckIn` (fees, staking rewards, payments config) and controls proxy upgrades.
- **Backend Signer** – Lives in `Factory.nftFactoryParameters().signerAddress`; must sign all venue/customer/promoter payloads before they are accepted on-chain.
- **Venue** – Deposits USDC, chooses bounty/payment rules, and maintains sufficient credits to cover promoter rewards.
- **Promoter** – Drives traffic to venues, accrues ERC-1155 promoter credits on verified visits, and redeems them via signed settlements.
- **Customer** – Pays venues in USDC or LONG and may trigger promoter rewards depending on attribution.

## Signature Matrix

Every state-changing action is signature gated. Detailed hashing formulas and client examples live in [`docs/guides/BelongCheckinSignatures.md`](./BelongCheckinSignatures.md). Quick reference:

| Payload | Signed Fields (packed order) | Consumed By | Notes |
|---------|------------------------------|-------------|-------|
| `VenueInfo` | `venue`, `referralCode`, `uri`, `chainId` | `BelongCheckIn.venueDeposit` | Authorizes rule updates and referral attribution; deposit amount is validated on-chain. |
| `CustomerInfo` | `paymentInUSDC`, `visitBountyAmount`, `spendBountyPercentage`, `customer`, `venueToPayFor`, `promoter`, `amount`, `chainId` | `BelongCheckIn.payToVenue` | Enforces venue payment/bounty rules, promoter attribution, and amount limits. |
| `PromoterInfo` | `promoter`, `venue`, `amountInUSD`, `chainId` | `BelongCheckIn.distributePromoterPayments` | Controls cash- or LONG-settled payouts; payout currency (`paymentInUSDC`) influences fee haircut but is unsigned. |

## Lifecycle Overview

### 1. Venue Deposit & Rule Configuration
1. Venue shares desired `VenueRules` (payment types, bounty types, LONG settlement mode) and deposit amount with the backend.
2. Backend validates referral code ownership, checks venue staking tier, and issues a signed `VenueInfo`.
3. Venue calls `venueDeposit(venueInfo)`:
   - Applies free-deposit counter (`fees.referralCreditsAmount`) before charging deposit fees.
   - Charges a flat convenience fee (converted to LONG and delivered to escrow) plus optional affiliate fee (`fees.affiliatePercentage`).
   - Mints venue ERC‑1155 credits mirroring the USD balance and forwards principal to `Escrow`.

### 2. Customer Check-In & Payment
1. App collects visit context (venue, promoter attribution, spend amount, currency) and forwards it to backend.
2. Backend confirms rules allow the requested payment method and bounty combination; signs `CustomerInfo`.
3. Customer calls `payToVenue(customerInfo)`:
   - If a promoter is set, burns venue credits equal to visit bounty + spend percentage, minting promoter credits instead.
   - For USDC payments: transfers full amount from customer to venue wallet.
   - For LONG payments: pulls platform subsidy from escrow, applies processing fee, collects discounted payment from customer, and routes LONG per venue rule (auto-stake, auto-convert to USDC, or direct transfer).

### 3. Promoter Settlement
1. Promoter requests payout and selects currency. Backend computes withdrawable USD amount (<= promoter credit balance) and signs `PromoterInfo`.
2. Promoter (or platform) calls `distributePromoterPayments(promoterInfo)`:
   - Retrieves staking tier to determine platform fee percentage (`stakingRewards[...] .promoterStakingInfo`).
   - Transfers payout from escrow to promoter (USDC) or swaps to LONG before delivery.
   - Burns the consumed promoter credits to prevent re-claims and streams platform fees through the buyback routine.

### 4. Revenue Sharing & Buyback
- Platform fees accumulated during deposits and payouts are partially swapped to LONG (`fees.buybackBurnPercentage`) and burned (via `burn` or sending to `DEAD`).
- Remaining revenue is forwarded to `Factory.nftFactoryParameters().platformAddress`.

## Economic Configuration

The `Fees` struct (owner-settable) governs:

- `referralCreditsAmount` – Number of deposit cycles exempt from deposit fees (rewarding new venues).
- `affiliatePercentage` – Cut of venue deposits credited to referral affiliates.
- `longCustomerDiscountPercentage` – Automatic discount applied when customers pay in LONG (default 3%).
- `platformSubsidyPercentage` & `processingFeePercentage` – LONG subsidy for venues and the platform’s share of that subsidy.
- `buybackBurnPercentage` – Portion of platform revenue used for LONG buyback & burn.

Staking tiers (`stakingRewards`) define per-tier:

- `depositFeePercentage` and `convenienceFeeAmount` for venues.
- `usdcPercentage` / `longPercentage` platform fee haircuts for promoter settlements depending on payout currency.

## Deployment & Operations

- **Scripts**: `scripts/mainnet-deployment/belong-checkin/*` deploy libraries, implementations, proxies, and helper tooling. See [`docs/guides/BelongCheckIn.md`](./BelongCheckIn.md) for step-by-step instructions.
- **State file**: Scripts persist addresses in `deployments/chainId-<id>.json` (keys include `signatureVerifier`, `helper`, `factory`, `checkIn`, etc.).
- **Environment variables**: Configure DEX routers, token addresses (USDC, LONG, WNative), Chainlink price feeds, and signer keys.
- **Upgrades**: Proxies are owned by the platform address. Use the provided upgrade scripts to deploy new implementations, then execute `ProxyAdmin` upgrades safely.

## Related Documentation

- Solidity API: `docs/contracts/v2/platform/BelongCheckIn.md`, `Factory.md`, `Escrow.md`, `Staking.md`, `CreditToken.md`.
- Deployment guide: `docs/guides/BelongCheckIn.md`.
- Signature recipes: `docs/guides/BelongCheckinSignatures.md`.
- Product collateral: [`belongnet/docs`](https://github.com/belongnet/docs/tree/main/content/3.belong-checkin) (customer/promoter/venue content).

## When to Use

Choose Belong CheckIn when you need:

- Pay-per-visit marketing with configurable visit and spend bounties.
- Granular control over promoter incentives plus venue-level bounty rules.
- Automatic discounting and subsidy flows for LONG payments, with optional staking rewards.
- Transparent accounting of venue deposits, promoter balances, and platform revenue.

For curated ERC-721 membership drops without visit tracking or credit tokens, use the token gating platform (see [`docs/guides/TokenGatingOverview.md`](./TokenGatingOverview.md)).
