# ITransferValidator721

This file is a legacy placeholder.

The current Cairo/Starknet implementation in this repository does not use an external `ITransferValidator721` interface.

## Current Status

- There is no transfer-validator contract in `src/`.
- Transferability is enforced directly by `NFT` in `src/nft/nft.cairo`.
- When a collection is created with `transferrable = false`, regular token transfers revert.

## Use Instead

- [NFT](../NFT.md)
