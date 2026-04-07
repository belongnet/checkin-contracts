# ReceiverFactory

The current Cairo implementation does not include a standalone `ReceiverFactory` contract.

This file is kept only so older links do not break.

## Current Behavior

Royalty receivers are deployed directly inside `NFTFactory.produce(...)`.

When `InstanceInfo.royalty_fraction > 0`, the factory:

1. Computes referral information.
2. Deploys a `Receiver`.
3. Passes the new receiver address into the `NFT` constructor as the royalty fee receiver.

If royalties are disabled, no receiver contract is deployed for that collection.

## See Instead

- [NFTFactory](./NFTFactory.md)
- [Royalties Receiver](../RoyaltiesReceiver.md)
