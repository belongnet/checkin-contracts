# Declaring Belong Contracts

This repository compiles three deployable Starknet contracts:

- `NFTFactory` -> `target/dev/nft_NFTFactory.contract_class.json`
- `NFT` -> `target/dev/nft_NFT.contract_class.json`
- `Receiver` -> `target/dev/nft_Receiver.contract_class.json`

## Prerequisites

Make sure these tools are available:

```bash
starkli --version
scarb --version
snforge --version
```

If not, follow [Environment Setup](./EnvSetUp.md).

You should also have a configured account:

- `STARKNET_ACCOUNT`
- `STARKNET_KEYSTORE`
- optionally `STARKNET_RPC`

See [Account Setup](./AccountSetUp.md) for details.

## Build

Compile the project before declaring classes:

```bash
scarb build
```

The resulting artifacts are written to `target/dev/`.

## Declare The Classes

Declare each contract class on the target network:

```bash
starkli declare target/dev/nft_NFT.contract_class.json --network sepolia
starkli declare target/dev/nft_Receiver.contract_class.json --network sepolia
starkli declare target/dev/nft_NFTFactory.contract_class.json --network sepolia
```

For mainnet, replace `sepolia` with your target network configuration or use `--rpc <RPC_URL>`.

## What To Save

Each successful declaration returns a class hash. Save these three values because you need them during factory initialization:

- `NFT_CLASS_HASH`
- `RECEIVER_CLASS_HASH`
- `FACTORY_CLASS_HASH`

If a class was already declared, Starkli will print the existing class hash instead of creating a new declaration. That is still a valid result.

## Recommended Order

Use this order so the hashes are easy to track:

1. `NFT`
2. `Receiver`
3. `NFTFactory`

## Related Step

After declaration, continue with [Deploying Belong Contracts](./DeployingSC.md).
