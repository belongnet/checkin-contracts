# ICreatorToken

This file is a legacy placeholder.

The current Cairo/Starknet codebase in this repository does not expose an `ICreatorToken` interface and does not use the old EVM transfer-validator pattern described in earlier documentation.

## Current Status

- No active Cairo contract in `src/` imports or implements `ICreatorToken`.
- Collection transfer behavior is controlled directly inside `src/nft/nft.cairo`.
- Transfer blocking is implemented through the `transferrable` flag and ERC721 hooks, not through an external transfer validator.

## Use Instead

- [NFT](../NFT.md)
- [NFTFactory](../factories/NFTFactory.md)
