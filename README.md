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
- **Legacy NFT Factory stack** — tooling for community membership collections, referral codes, and ERC-2981 royalty routing. See [`docs/guides/NftTicketingOverview.md`](./docs/guides/NftTicketingOverview.md) for the complete reference.

## Documentation Index

### Legacy NFT Factory Stack

- High-level narrative: [`docs/guides/NftTicketingOverview.md`](./docs/guides/NftTicketingOverview.md).
- Docs for V2 contracts live under [`docs/contracts/v2`](./docs/contracts/v2) (Factory, ReceiverFactory, ReferralSystem, NFT, RoyaltiesReceiver, and supporting structs).
- Utility modules supporting the factory flow are covered in [`docs/contracts/v2/utils`](./docs/contracts/v2/utils) and [`docs/contracts/utils`](./docs/contracts/utils).
- Interface references for downstream integrations reside in [`docs/contracts/interfaces`](./docs/contracts/interfaces).

### Belong CheckIn Platform (V2)

- Platform overview: [`docs/guides/BelongCheckinOverview.md`](./docs/guides/BelongCheckinOverview.md).
- Core contract reference: [`docs/contracts/v2/platform/BelongCheckIn.md`](./docs/contracts/v2/platform/BelongCheckIn.md).
- Platform Factory wiring: [`docs/contracts/v2/platform/Factory.md`](./docs/contracts/v2/platform/Factory.md).
- Shared structs and enums: [`docs/contracts/v2/Structures.md`](./docs/contracts/v2/Structures.md).
- Signature requirements primer: [`docs/guides/BelongCheckinSignatures.md`](./docs/guides/BelongCheckinSignatures.md).
