# Royalties Receiver

Source: `src/receiver/receiver.cairo`

This file keeps the historical "RoyaltiesReceiver" naming used in earlier documentation. The current Cairo contract is named `Receiver`.

## Overview

`Receiver` is the royalty distribution contract deployed by `NFTFactory` for a collection when `royalty_fraction > 0`.

It distributes ERC20 proceeds between:

- the collection creator
- the platform
- an optional referral beneficiary

## Constructor

Constructor arguments:

- `referral_code`
- `creator`
- `platform`
- `referral`

The constructor assigns shares as follows:

- creator: `8000` bps
- platform: `2000` bps minus any referral share
- referral: calculated by `NFTFactory.getReferralRate(...)` when a valid referral applies

Total shares are normalized against `10000`.

## Main External Methods

### `releaseAll(payment_token)`

Releases all currently claimable ERC20 funds for every configured payee.

### `released(account)`

Returns how much has already been released to a specific account.

### `totalReleased()`

Returns the total amount released by the receiver.

### `payees()`

Returns the payee list.

### `shares(account)`

Returns the configured share for a payee.

## Behavior

- Funds are split proportionally based on shares.
- If a payee has nothing pending, release for that payee is skipped.
- The contract does not hold platform configuration itself; it relies on the constructor inputs supplied by `NFTFactory`.

## Important Notes

- The current implementation handles ERC20 tokens only.
- There is no separate `ReceiverFactory` contract in this codebase.
- `Receiver` is created automatically by `NFTFactory.produce(...)` when royalties are enabled.
