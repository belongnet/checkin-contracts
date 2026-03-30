import { expect } from 'chai';

import {
  buildConsensus,
  computeMedian,
  deviationBps,
  parseDecimalToUnits,
  shouldPublishUpdate,
} from '../../../scripts/mainnet-deployment/belong-checkin/exchange-long-price-feed';

describe('exchange-long-price-feed helpers', () => {
  it('parses decimal prices into feed units', () => {
    expect(parseDecimalToUnits('1.23456789', 8)).to.eq(123456789n);
    expect(parseDecimalToUnits('2', 8)).to.eq(200000000n);
  });

  it('computes medians for odd and even sets', () => {
    expect(computeMedian([100n, 300n, 200n])).to.eq(200n);
    expect(computeMedian([100n, 300n, 200n, 500n])).to.eq(250n);
  });

  it('computes basis-point deviation', () => {
    expect(deviationBps(10100n, 10000n)).to.eq(100n);
    expect(deviationBps(9500n, 10000n)).to.eq(500n);
  });

  it('rejects outliers while preserving consensus', () => {
    const consensus = buildConsensus(
      [
        { source: 'binance', price: 100000000n, rawPrice: '1.0', fetchedAtMs: 1 },
        { source: 'gate', price: 101000000n, rawPrice: '1.01', fetchedAtMs: 1 },
        { source: 'mexc', price: 160000000n, rawPrice: '1.6', fetchedAtMs: 1 },
      ],
      300n,
      2,
    );

    expect(consensus.median).to.eq(100500000n);
    expect(consensus.accepted.map(observation => observation.source)).to.deep.eq(['binance', 'gate']);
    expect(consensus.rejected.map(rejection => rejection.source)).to.deep.eq(['mexc']);
  });

  it('updates on heartbeat or threshold and skips otherwise', () => {
    expect(
      shouldPublishUpdate({
        nextAnswer: 100000000n,
        thresholdBps: 100n,
        heartbeatSeconds: 900,
        nowSeconds: 1000,
      }).reason,
    ).to.eq('missing-onchain-round');

    expect(
      shouldPublishUpdate({
        currentAnswer: 100000000n,
        currentUpdatedAt: 1,
        nextAnswer: 100500000n,
        thresholdBps: 100n,
        heartbeatSeconds: 900,
        nowSeconds: 1000,
      }).reason,
    ).to.eq('heartbeat');

    expect(
      shouldPublishUpdate({
        currentAnswer: 100000000n,
        currentUpdatedAt: 950,
        nextAnswer: 101100000n,
        thresholdBps: 100n,
        heartbeatSeconds: 900,
        nowSeconds: 1000,
      }).reason,
    ).to.eq('threshold');

    expect(
      shouldPublishUpdate({
        currentAnswer: 100000000n,
        currentUpdatedAt: 950,
        nextAnswer: 100500000n,
        thresholdBps: 100n,
        heartbeatSeconds: 900,
        nowSeconds: 1000,
      }).reason,
    ).to.eq('skip');
  });
});
