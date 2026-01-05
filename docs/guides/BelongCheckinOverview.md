# Belong CheckIn Platform Overview

Belong CheckIn (contracts under `contracts/v2`) powers venue-based referral marketing where deposits, customer visits, and promoter payouts are tracked on-chain. This guide outlines the moving pieces, signature requirements, and supporting documentation for integrators.

## Core Concepts

- **Credit token accounting** – Venues pre-fund USDtoken deposits (typically USDC) that mint ERC‑1155 “venue credits”. Promoter credits are minted on visits and burned on settlement, preventing double spending.
- **Signature-gated actions** – All external flows are authorized off-chain by the platform signer. Signatures carry a `SignatureProtection` prefix (`verifyingContract`, `nonce`, `deadline`, `chainId`) and are verified on-chain by `SignatureVerifier`.
- **Escrow & swaps** – Funds remain in `Escrow` until released; DEX swaps handle LONG↔USDtoken conversions for customer subsidies, promoter payouts, and buyback/burn routines.
- **Tiered economics** – Staking balances determine deposit fees, convenience charges, and promoter payout haircuts, aligning incentives for heavy LONG holders.
- **Composable payment options** – Venues can accept USDtoken and/or LONG, choose how LONG payments are routed (auto-stake/auto-convert/direct), and optionally enable promoter bounty types (visit/spend/both).

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
- **Venue** – Deposits USDtoken, chooses bounty/payment rules, and maintains sufficient credits to cover promoter rewards.
- **Promoter** – Drives traffic to venues, accrues ERC-1155 promoter credits on verified visits, and redeems them via signed settlements.
- **Customer** – Pays venues in USDtoken or LONG and may trigger promoter rewards depending on attribution.

## Signature Matrix

Every state-changing action is signature gated. All digests include the shared prefix
`(verifyingContract, nonce, deadline, chainId)`. The table below lists the payload
fields that follow that prefix. Full hashing recipes and client examples live in
[`docs/guides/BelongCheckinSignatures.md`](./BelongCheckinSignatures.md).

| Payload | Signed Fields (after prefix) | Consumed By | Notes |
|---------|------------------------------|-------------|-------|
| `VenueInfo` | `venue`, `affiliateReferralCode`, `uri` | `BelongCheckIn.venueDeposit` | Authorizes referral attribution and metadata URI; `rules` and `amount` are validated on-chain but unsigned. |
| `CustomerInfo` | `rules.bountyType`, `rules.bountyAllocationType`, `paymentInUSDtoken`, `toCustomer`, `toPromoter`, `customer`, `venueToPayFor`, `promoterReferralCode`, `amount` | `BelongCheckIn.payToVenue` | Bounties are signed as `abi.encode(visitBountyAmount, spendBountyPercentage)` for each side. |
| `PromoterInfo` | `promoterReferralCode`, `venue`, `amountInUSD` | `BelongCheckIn.distributePromoterPayments` | Payout currency flag (`paymentInUSDtoken`) is unsigned and must be enforced by the backend. |

## Lifecycle Overview

### 1. Venue Deposit & Rule Configuration
1. Venue shares desired `VenueRules` (payment types, bounty types, LONG settlement mode) and deposit amount with the backend.
2. Backend validates referral code ownership, checks venue staking tier, and issues a signed `VenueInfo`.
3. Venue calls `venueDeposit(venueInfo)` (EOA-only):
   - Applies free-deposit counter (`fees.referralCreditsAmount`) before charging deposit fees.
   - Charges a flat convenience fee (converted to LONG and delivered to escrow) plus optional affiliate fee (`fees.affiliatePercentage`).
   - Mints venue ERC‑1155 credits mirroring the USD balance and forwards principal to `Escrow`.

### 2. Customer Check-In & Payment
1. App collects visit context (venue, promoter attribution, spend amount, currency) and forwards it to backend.
2. Backend confirms rules allow the requested payment method and bounty combination; signs `CustomerInfo`.
3. Customer calls `payToVenue(customerInfo)` (EOA-only):
   - If a promoter is set, burns venue credits equal to visit bounty + spend percentage, minting promoter credits instead.
   - For USDtoken payments: transfers full amount from customer to venue wallet.
   - For LONG payments: pulls platform subsidy from escrow, applies processing fee, collects discounted payment from customer, and routes LONG per venue rule (auto-stake, auto-convert to USDtoken, or direct transfer).

### 3. Promoter Settlement
1. Promoter requests payout and selects currency. Backend computes withdrawable USD amount (<= promoter credit balance) and signs `PromoterInfo`.
2. Promoter (or platform) calls `distributePromoterPayments(promoterInfo)` (EOA-only):
   - Retrieves staking tier to determine platform fee percentage (`stakingRewards[...] .promoterStakingInfo`).
   - Transfers payout from escrow to promoter (USDtoken) or swaps to LONG before delivery.
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
- **Environment variables**: Configure DEX routers, token addresses (USDtoken, LONG, WNative), Chainlink price feeds, and signer keys.
- **Upgrades**: Proxies are owned by the platform address. Use the provided upgrade scripts to deploy new implementations, then execute `ProxyAdmin` upgrades safely.

## Deployment & Wiring Checklist (Quick)

1. Deploy libraries (`SignatureVerifier`, `Helper`) and implementation contracts (AccessToken, CreditToken, RoyaltiesReceiverV2, VestingWalletExtended).
2. Deploy the `Factory` proxy and initialize it with `FactoryParameters`, `RoyaltiesParameters`, implementations, and referral percentages.
3. Deploy `LONG` and `Staking` (set admin/pauser/treasury).
4. Deploy `BelongCheckIn` and call `initialize(owner, paymentsInfo)`.
5. Deploy `Escrow` and call `initialize(belongCheckIn)`.
6. Deploy venue/promoter `CreditToken` contracts via the Factory.
7. Call `BelongCheckIn.setContracts` with `Factory`, `Escrow`, `Staking`, credit tokens, and the LONG price feed.
8. Optionally update `BelongCheckIn` fees/rewards/payments config as your economics evolve.

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
