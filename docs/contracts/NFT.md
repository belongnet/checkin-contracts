# NFT

Source: `src/nft/nft.cairo`

## Overview

`NFT` is the per-collection contract deployed by `NFTFactory`. It combines:

- ERC721 minting
- collection-level payment settings
- ERC2981 royalties metadata
- optional transfer blocking
- SNIP-12 signature-verified minting

The contract is deployed by the factory and initialized once with `NftParameters`.

## Constructor

Constructor arguments:

- `creator`
- `factory`
- `name`
- `symbol`
- `fee_receiver`
- `royalty_fraction`

The constructor sets the collection owner to `creator`, stores the factory address, initializes ERC721 metadata, and enables ERC2981 royalties when both `fee_receiver` and `royalty_fraction` are non-zero.

## Main External Methods

### `initialize(nftParameters)`

- Callable only by the factory.
- Callable only once.
- Stores payment token, mint prices, max supply, transferability, contract URI hash, and referral code.

### `setPaymentInfo(paymentToken, mintPrice, whitelistedMintPrice)`

- Callable only by the collection owner.
- Updates the ERC20 payment token and collection pricing.

### `addWhitelisted(address)`

- Callable only by the collection owner.
- Marks an address as whitelisted for static-price minting.

### `mintStaticPrice(signaturesProtection, staticParams, expectedPayingToken, expectedMintPrice)`

- Verifies SNIP-12 signed mint payloads through the signer configured in `NFTFactory`.
- Validates whitelist state against the signed payload.
- Uses collection-level mint price or whitelisted mint price.
- Pulls ERC20 funds from the caller and splits them between creator, platform, and optional referral beneficiary.

### `mintDynamicPrice(signaturesProtection, dynamicParams, expectedPayingToken)`

- Verifies SNIP-12 signed mint payloads through the signer configured in `NFTFactory`.
- Uses the signed per-item price from each payload.
- Pulls ERC20 funds from the caller and splits them between creator, platform, and optional referral beneficiary.

## Views

- `nftParameters()`
- `metadataUri(tokenId)`
- `contractUri()`
- `creator()`
- `factory()`
- `totalSupply()`
- `isWhitelisted(address)`
- `tokenUriHash(token_uri)`

## Payment Model

The current Cairo implementation is ERC20-only.

For each mint, the contract:

1. Checks that `expectedPayingToken` matches the configured payment token.
2. Reads `platform_commission` from `NFTFactory`.
3. Computes platform fees and creator proceeds.
4. Sends fees to the platform.
5. Sends optional referral fees when a referral code is active.
6. Sends the remaining amount to the creator.

## Transferability

`transferrable` is enforced in the ERC721 transfer hook:

- mints are still allowed
- burns are unaffected
- regular transfers revert when `transferrable` is `false`

## Events

- `PaymentInfoChanged`
- `Paid`

## Important Notes

- `contractUri()` returns the stored contract URI hash, not the original string.
- The collection can only be initialized once.
- Total supply is enforced by `max_total_supply`.
- `NFT` includes OpenZeppelin Cairo `UpgradeableComponent`, so the collection owner can call `upgrade(new_class_hash)`.
