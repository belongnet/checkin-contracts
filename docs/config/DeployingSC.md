# Deploying Belong Contracts

This guide covers the actual deployment flow for the current Cairo/Starknet codebase in this repository.

## What Gets Deployed

The normal deployment sequence is:

1. Declare `NFT`, `Receiver`, and `NFTFactory`.
2. Deploy a single `NFTFactory` instance.
3. Initialize `NFTFactory` with class hashes and platform settings.
4. Use `NFTFactory.produce(...)` to deploy collection-specific `NFT` contracts.
5. Let `NFTFactory` deploy a `Receiver` automatically when royalties are enabled for a collection.

There is no standalone `ReceiverFactory` contract in the current implementation.

## Prerequisites

- Follow [Environment Setup](./EnvSetUp.md).
- Follow [Account Setup](./AccountSetUp.md).
- Declare the classes first as described in [Declaring Belong Contracts](./DeclaringSC.md).

Recommended environment variables:

```bash
export STARKNET_ACCOUNT=~/.starkli-wallets/deployer/account.json
export STARKNET_KEYSTORE=~/.starkli-wallets/deployer/keystore.json
export STARKNET_RPC=<YOUR_RPC_URL>
```

Project-specific values you will need:

```bash
export FACTORY_CLASS_HASH=0x...
export NFT_CLASS_HASH=0x...
export RECEIVER_CLASS_HASH=0x...

export OWNER_ADDRESS=0x...
export SIGNER_ADDRESS=0x...
export DEFAULT_PAYMENT_CURRENCY=0x...
export PLATFORM_ADDRESS=0x...
```

## Build

Always build before deploying:

```bash
scarb build
```

## Deploy `NFTFactory`

`NFTFactory` has a single constructor argument: the owner address.

```bash
starkli deploy $FACTORY_CLASS_HASH $OWNER_ADDRESS --network sepolia
```

Save the deployed address from the command output as:

```bash
export FACTORY_ADDRESS=0x...
```

## Initialize `NFTFactory`

After deployment, call `initialize(...)` once as the factory owner.

The factory expects:

- `nft_class_hash`
- `receiver_class_hash`
- `FactoryParameters`
  - `signer`
  - `default_payment_currency`
  - `platform_address`
  - `platform_commission` as `u256`
  - `max_array_size` as `u256`
- `percentages` as a 5-element array

### Notes About Calldata Encoding

- Starkli passes Cairo structs as flattened calldata.
- Each `u256` must be passed as two felts: `low high`.
- The `percentages` span is passed as `len item0 item1 item2 item3 item4`.

Example initialization:

```bash
starkli invoke $FACTORY_ADDRESS initialize \
  $NFT_CLASS_HASH \
  $RECEIVER_CLASS_HASH \
  $SIGNER_ADDRESS \
  $DEFAULT_PAYMENT_CURRENCY \
  $PLATFORM_ADDRESS \
  100 0 \
  10 0 \
  5 0 5000 3000 1500 500 \
  --network sepolia
```

In this example:

- `platform_commission = 100` means `1%` when the fee denominator is `10000`.
- `max_array_size = 10`
- referral percentages are `[0, 5000, 3000, 1500, 500]`

The first percentage slot is effectively reserved because referral usage starts from index `1` after the first successful use.

## Sanity Checks

You can verify the deployed configuration with read calls such as:

```bash
starkli call $FACTORY_ADDRESS signer --network sepolia
starkli call $FACTORY_ADDRESS maxArraySize --network sepolia
starkli call $FACTORY_ADDRESS platformParams --network sepolia
```

## Deploying A Collection

Collections are not deployed by calling `starkli deploy` directly. They are created through `NFTFactory.produce(...)`.

High-level flow:

1. Backend builds the SNIP-12 `ProduceHash` payload.
2. Backend signs that payload with the configured signer account.
3. Creator submits `produce(signature_protection, instance_info)` to `NFTFactory`.
4. `NFTFactory` deploys:
   - an `NFT` contract
   - a `Receiver` contract only if `royalty_fraction > 0`
5. `NFTFactory` initializes the new `NFT` with payment settings and metadata hashes.

Useful helper scripts:

- `scarb run produce-message`
- `npx tsx scripts/produce-signature.ts`

These scripts are examples for message construction and signing. They are not a complete production deployment pipeline by themselves.

## Collection Configuration Notes

- If `InstanceInfo.payment_token` is zero, the factory uses `FactoryParameters.default_payment_currency`.
- `name` and `symbol` are uniqueness keys; the same pair cannot be produced twice.
- `transferrable` is enforced inside the collection contract and affects all token transfers.
- `contract_uri` is stored onchain as a hash.

## Minting Notes

After a collection exists:

- use `mintStaticPrice(...)` when the price is derived from collection-level pricing and whitelist state
- use `mintDynamicPrice(...)` when each token mint has its own signed price

Both mint flows require backend signatures validated against the signer configured in `NFTFactory`.
