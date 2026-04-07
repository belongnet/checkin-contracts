# Referral Logic

The current Cairo/Starknet codebase does not have a standalone `ReferralSystem` contract.

Referral behavior is implemented directly inside `NFTFactory`.

## Where It Lives

Source: `src/nftfactory/nftfactory.cairo`

Relevant methods:

- `createReferralCode()`
- `usedToPercentage(timesUsed)`
- `getReferralRate(referral_user, referral_code, amount)`
- `getReferralCreator(referral_code)`
- `getReferralUsers(referral_code)`

## How It Works

1. A user calls `createReferralCode()` and becomes the referral creator for that code.
2. During `produce(...)`, the factory records referral usage for the collection creator when a non-zero referral code is supplied.
3. Referral percentages are read from the factory's 5-entry percentage table.
4. Referral rewards are paid out from the platform fee portion, not from the creator's portion.
5. When a collection mints, `NFT` asks `NFTFactory` for the referral rate and transfers the referral share to the referral creator.

## Important Notes

- A user cannot refer themselves.
- Referral usage is tracked per user and per code.
- The usage counter is capped after repeated use.
- The first percentage slot is effectively reserved for zero usage.

## See Also

- [NFTFactory](../factories/NFTFactory.md)
- [NFT](../NFT.md)
