# Hardhat

## Hardhat Usage

### Install Dependencies

```shell
$ yarn or yarn install
```

### Environment Setup

Rename `.env.example` to `.env` and populate provider credentials (Infura/Alchemy, explorer API keys) alongside deployer information (`PK`, `MNEMONIC`, or `LEDGER_ADDRESS`).

Refer to:

- [`docs/guides/NftTicketingGuide.md`](./NftTicketingGuide.md) for NFT factory–specific variables and deployment flow.
- [`docs/guides/BelongCheckInGuide.md`](./BelongCheckInGuide.md) for Belong CheckIn stacks.

### Compile

```shell
$ yarn compile
```

### Test

```shell
$ yarn test
```

### Coverage

```shell
$ yarn coverage
```

### Deployment & Verification

Detailed deployment pipelines live alongside the product-specific guides:

- [`docs/guides/NftTicketingGuide.md`](./NftTicketingGuide.md) – NFT factory deployments, verification, and referral configuration.
- [`docs/guides/BelongCheckInGuide.md`](./BelongCheckInGuide.md) – Belong CheckIn stack deployments, upgrades, and liquidity tooling.

### [Deployed Crypto Addresses](./../addresses.md)
