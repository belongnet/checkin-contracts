# CreatorToken

This file is a legacy placeholder.

The old `CreatorToken` transfer-validator model is not part of the active Cairo implementation in this repository.

## Current Status

- No current contract under `src/` imports or extends a `CreatorToken` utility.
- The collection contract enforces transfer restrictions internally through ERC721 hooks.
- The main configurable transfer behavior is the `transferrable` flag stored in `NftParameters`.

## Use Instead

- [NFT](../NFT.md)
- [Core Cairo Structures](../Structures.md)
