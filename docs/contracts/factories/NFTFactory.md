# NFTFactory

Source: `src/nftfactory/nftfactory.cairo`

## Overview

`NFTFactory` is the top-level deployment and configuration contract for the Belong Starknet flow.

It is responsible for:

- storing global platform parameters
- storing the class hashes used for collection deployment
- verifying backend-signed `ProduceHash` payloads
- deploying `NFT` contracts
- deploying `Receiver` contracts when royalties are enabled
- managing referral codes and referral usage accounting

## Deployment Model

`NFTFactory` is deployed once with an owner address in the constructor.

After deployment, the owner must call `initialize(...)` with:

- `NFT` class hash
- `Receiver` class hash
- `FactoryParameters`
- referral percentages array

Without initialization, collection production cannot work correctly.

## Main External Methods

### `initialize(nft_class_hash, receiver_class_hash, factory_parameters, percentages)`

- Callable only by the owner.
- Callable only once.
- Stores the class hashes used for deploying future collections.
- Stores signer, payment, platform, and referral configuration.

### `produce(signature_protection, instance_info)`

- Verifies a SNIP-12 signed `ProduceHash`.
- Ensures `(name, symbol)` has not already been used.
- Uses `default_payment_currency` when `instance_info.payment_token` is zero.
- Optionally deploys a `Receiver` when `royalty_fraction > 0`.
- Deploys a new `NFT`.
- Initializes the new collection with `NftParameters`.
- Stores `NftInfo` keyed by the hash of `(name, symbol)`.

### `createReferralCode()`

Creates a deterministic referral code for the caller and stores the caller as the referral creator.

### `updateNftClassHash(class_hash)`

Owner-only update for the `NFT` class hash used in future deployments.

### `updateReceiverClassHash(class_hash)`

Owner-only update for the `Receiver` class hash used in future deployments.

### `setFactoryParameters(factory_parameters)`

Owner-only update for signer, default payment token, platform address, platform commission, and max batch size.

### `setReferralPercentages(percentages)`

Owner-only update for the 5-entry referral percentage table.

## Views

- `nftInfo(name, symbol)`
- `nftFactoryParameters()`
- `maxArraySize()`
- `signer()`
- `platformParams()`
- `usedToPercentage(timesUsed)`
- `referralCode(account)`
- `getReferralRate(referral_user, referral_code, amount)`
- `getReferralCreator(referral_code)`
- `getReferralUsers(referral_code)`
- `produceHash(name, symbol, contract_uri)`

## Referral Logic

Referral usage is tracked per user and per referral code.

- The percentage table must contain exactly 5 entries.
- The first slot is effectively reserved for zero usage.
- After each successful use, the tracked usage count increases up to a capped value.
- Referral share is taken out of the platform fee, not out of the creator proceeds.

## Important Notes

- There is no standalone `ReceiverFactory` in the current Cairo codebase.
- Collection uniqueness is based on the hash of `name` and `symbol`.
- `NFTFactory` validates SNIP-12 identifiers and rejects empty strings, non-ASCII values, and certain punctuation.
- `NFTFactory` includes OpenZeppelin Cairo `UpgradeableComponent`, so the owner can call `upgrade(new_class_hash)`.
