# Belong.net

## Install Node.js, npm, yarn

- Download the LTS (Long Term Support) version for your operating system from [Node.js official website](https://nodejs.org/).

- Install this version.

- Verify `node.js` installation:

```shell
$ node -v
```

Example output:

```shell
$ v16.x.x or higher
```

- Verify `npm` installation:

```shell
$ npm -v
```

Example output:

```shell
$ v16.x.x or higher
```

- Install `yarn`:

```shell
$ npm install --global yarn
```

- Verify installation:

```shell
$ yarn -v
```

## HardHat Usage

Check [HardHat guide](./docs/guides/HardHat.md).

## Foundry Usage

Check [Foundry guide](./docs/guides/Foundry.md).

## Project Overview

Belong now ships two major product lines:

- **Belong CheckIn (v2 platform)** — on-chain venue deposits, customer check-ins, and promoter settlements coordinated by `contracts/v2/platform/BelongCheckIn.sol`. It relies on Escrow, Staking, and tiered fee tables to handle deposit fees, promoter rewards, and buyback/burn flows. Generated contract docs live under [`docs/contracts/v2/platform`](./docs/contracts/v2/platform), and customer/promoter/venue flows are covered in the external docs at [belongnet/docs](https://github.com/belongnet/docs/tree/main/content/3.belong-checkin).
- **Token Gating platform** — tooling for membership collections, referral codes, and ERC-2981 royalty routing. See [`docs/guides/TokenGatingOverview.md`](./docs/guides/TokenGatingOverview.md) for the complete reference.

## Documentation Index

### Token Gating Platform

- Deployment guide: [`docs/guides/TokenGatingGuide.md`](./docs/guides/TokenGatingGuide.md).
- High-level narrative: [`docs/guides/TokenGatingOverview.md`](./docs/guides/TokenGatingOverview.md).
- API docs for V1 contracts live under [`docs/contracts/v1`](./docs/contracts/v1) (Factory, ReceiverFactory, ReferralSystem, NFT, RoyaltiesReceiver, and supporting structs).
- Utility modules supporting the factory flow are covered in [`docs/contracts/v1/utils`](./docs/contracts/v1/utils) and [`docs/contracts/utils`](./docs/contracts/utils).
- Interface references for downstream integrations reside in [`docs/contracts/interfaces`](./docs/contracts/interfaces).

### Belong CheckIn Platform (V2)

- Deployment guide: [`docs/guides/BelongCheckInGuide.md`](./docs/guides/BelongCheckInGuide.md).
- Platform overview: [`docs/guides/BelongCheckinOverview.md`](./docs/guides/BelongCheckinOverview.md).
- Core contract reference: [`docs/contracts/v2/platform/BelongCheckIn.md`](./docs/contracts/v2/platform/BelongCheckIn.md).
- Platform Factory wiring: [`docs/contracts/v2/platform/Factory.md`](./docs/contracts/v2/platform/Factory.md).
- Shared structs and enums: [`docs/contracts/v2/Structures.md`](./docs/contracts/v2/Structures.md).
- Signature requirements primer: [`docs/guides/BelongCheckinSignatures.md`](./docs/guides/BelongCheckinSignatures.md).
