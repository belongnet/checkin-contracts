import https from 'https';

export type ExchangeSourceName = 'binance' | 'gate' | 'mexc';

export interface PriceObservation {
  source: ExchangeSourceName;
  price: bigint;
  rawPrice: string;
  fetchedAtMs: number;
}

export interface PriceRejection {
  source: ExchangeSourceName;
  reason: string;
  rawPrice?: string;
}

export interface ConsensusResult {
  median: bigint;
  accepted: PriceObservation[];
  rejected: PriceRejection[];
}

export interface ExchangeFetchConfig {
  decimals: number;
  sources: ExchangeSourceName[];
  binanceAlphaChainId: string;
  binanceAlphaContract: string;
  gatePair: string;
  mexcSymbol: string;
}

export interface UpdateDecision {
  shouldUpdate: boolean;
  reason: 'missing-onchain-round' | 'heartbeat' | 'threshold' | 'skip';
  deviationBps: bigint | null;
  ageSeconds: number | null;
}

export function parseSourceList(raw: string | undefined): ExchangeSourceName[] {
  const normalized = (raw ?? 'binance,gate,mexc')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  const unique = [...new Set(normalized)];
  const allowed: ExchangeSourceName[] = ['binance', 'gate', 'mexc'];

  for (const value of unique) {
    if (!allowed.includes(value as ExchangeSourceName)) {
      throw new Error(`Unsupported LONG price source: ${value}`);
    }
  }

  return unique as ExchangeSourceName[];
}

export function parseDecimalToUnits(value: string, decimals: number): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid decimal value: ${value}`);
  }

  const [wholePart, fractionPart = ''] = normalized.split('.');
  const paddedFraction = (fractionPart + '0'.repeat(decimals)).slice(0, decimals);

  return BigInt(wholePart) * 10n ** BigInt(decimals) + BigInt(paddedFraction || '0');
}

export function formatUnits(value: bigint, decimals: number): string {
  const negative = value < 0;
  const absolute = negative ? -value : value;
  const scale = 10n ** BigInt(decimals);
  const whole = absolute / scale;
  const fraction = absolute % scale;
  const paddedFraction = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  const formatted = paddedFraction.length > 0 ? `${whole.toString()}.${paddedFraction}` : whole.toString();

  return negative ? `-${formatted}` : formatted;
}

export function midpoint(a: bigint, b: bigint): bigint {
  return (a + b) / 2n;
}

export function computeMedian(values: bigint[]): bigint {
  if (values.length === 0) {
    throw new Error('Cannot compute median of an empty set.');
  }

  const sorted = [...values].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return midpoint(sorted[middle - 1], sorted[middle]);
}

export function deviationBps(value: bigint, reference: bigint): bigint {
  if (value <= 0n || reference <= 0n) {
    throw new Error(`Cannot compute deviation for non-positive values: ${value}, ${reference}`);
  }

  const diff = value > reference ? value - reference : reference - value;

  return (diff * 10_000n) / reference;
}

export function buildConsensus(
  observations: PriceObservation[],
  maxSourceDeviationBps: bigint,
  minSources: number,
): ConsensusResult {
  if (observations.length < minSources) {
    throw new Error(`Not enough exchange prices. Required ${minSources}, received ${observations.length}.`);
  }

  let accepted = [...observations];
  const rejected: PriceRejection[] = [];

  while (true) {
    const median = computeMedian(accepted.map(observation => observation.price));
    const withinThreshold = accepted.filter(
      observation => deviationBps(observation.price, median) <= maxSourceDeviationBps,
    );
    const discarded = accepted.filter(
      observation => deviationBps(observation.price, median) > maxSourceDeviationBps,
    );

    if (discarded.length === 0) {
      return {
        median,
        accepted,
        rejected,
      };
    }

    if (withinThreshold.length < minSources) {
      throw new Error(
        `Exchange prices diverged too much. Need ${minSources} within ${maxSourceDeviationBps.toString()} bps.`,
      );
    }

    rejected.push(
      ...discarded.map(observation => ({
        source: observation.source,
        reason: `deviation>${maxSourceDeviationBps.toString()}bps`,
        rawPrice: observation.rawPrice,
      })),
    );
    accepted = withinThreshold;
  }
}

export function shouldPublishUpdate(params: {
  currentAnswer?: bigint;
  currentUpdatedAt?: number;
  nextAnswer: bigint;
  thresholdBps: bigint;
  heartbeatSeconds: number;
  nowSeconds?: number;
}): UpdateDecision {
  const nowSeconds = params.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (!params.currentAnswer || !params.currentUpdatedAt) {
    return {
      shouldUpdate: true,
      reason: 'missing-onchain-round',
      deviationBps: null,
      ageSeconds: null,
    };
  }

  const ageSeconds = Math.max(0, nowSeconds - params.currentUpdatedAt);
  const changeBps = deviationBps(params.nextAnswer, params.currentAnswer);

  if (ageSeconds >= params.heartbeatSeconds) {
    return {
      shouldUpdate: true,
      reason: 'heartbeat',
      deviationBps: changeBps,
      ageSeconds,
    };
  }

  if (changeBps >= params.thresholdBps) {
    return {
      shouldUpdate: true,
      reason: 'threshold',
      deviationBps: changeBps,
      ageSeconds,
    };
  }

  return {
    shouldUpdate: false,
    reason: 'skip',
    deviationBps: changeBps,
    ageSeconds,
  };
}

export async function fetchExchangePrices(config: ExchangeFetchConfig): Promise<{
  observations: PriceObservation[];
  rejections: PriceRejection[];
}> {
  const fetchers: Record<ExchangeSourceName, () => Promise<PriceObservation>> = {
    binance: () => fetchBinanceAlphaPrice(config.binanceAlphaContract, config.binanceAlphaChainId, config.decimals),
    gate: () => fetchGatePrice(config.gatePair, config.decimals),
    mexc: () => fetchMexcPrice(config.mexcSymbol, config.decimals),
  };

  const results = await Promise.allSettled(config.sources.map(source => fetchers[source]()));
  const observations: PriceObservation[] = [];
  const rejections: PriceRejection[] = [];

  for (let i = 0; i < results.length; i += 1) {
    const source = config.sources[i];
    const result = results[i];

    if (result.status === 'fulfilled') {
      observations.push(result.value);
    } else {
      rejections.push({
        source,
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  }

  return { observations, rejections };
}

async function fetchBinanceAlphaPrice(
  contractAddress: string,
  chainId: string,
  decimals: number,
): Promise<PriceObservation> {
  const response = await getJson<{
    success?: boolean;
    data?: Array<{ contractAddress?: string; price?: string }>;
  }>(
    `https://web3.binance.com/bapi/defi/v5/public/wallet-direct/buw/wallet/market/token/search?keyword=${contractAddress}&chainIds=${chainId}`,
  );
  const rawPrice = response.data?.find(
    token => token.contractAddress?.toLowerCase() === contractAddress.toLowerCase(),
  )?.price;

  if (!response.success || !rawPrice) {
    throw new Error(`Binance Alpha returned no price for ${contractAddress} on chain ${chainId}`);
  }

  return {
    source: 'binance',
    price: parseDecimalToUnits(rawPrice, decimals),
    rawPrice,
    fetchedAtMs: Date.now(),
  };
}

async function fetchGatePrice(pair: string, decimals: number): Promise<PriceObservation> {
  const response = await getJson<Array<{ last?: string; highest_bid?: string; lowest_ask?: string }>>(
    `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${pair}`,
    { Accept: 'application/json' },
  );
  const ticker = response[0];

  if (!ticker) {
    throw new Error(`Gate returned no ticker for ${pair}`);
  }

  const bid = ticker.highest_bid ? parseDecimalToUnits(ticker.highest_bid, decimals) : 0n;
  const ask = ticker.lowest_ask ? parseDecimalToUnits(ticker.lowest_ask, decimals) : 0n;
  const last = ticker.last ? parseDecimalToUnits(ticker.last, decimals) : 0n;

  const price = bid > 0n && ask > 0n ? midpoint(bid, ask) : last;
  if (price <= 0n) {
    throw new Error(`Gate returned non-positive ticker for ${pair}`);
  }

  return {
    source: 'gate',
    price,
    rawPrice: ticker.last ?? formatUnits(price, decimals),
    fetchedAtMs: Date.now(),
  };
}

async function fetchMexcPrice(symbol: string, decimals: number): Promise<PriceObservation> {
  const response = await getJson<{ price?: string }>(`https://api.mexc.com/api/v3/avgPrice?symbol=${symbol}`);
  const rawPrice = response.price;

  if (!rawPrice) {
    throw new Error(`MEXC returned no price for ${symbol}`);
  }

  return {
    source: 'mexc',
    price: parseDecimalToUnits(rawPrice, decimals),
    rawPrice,
    fetchedAtMs: Date.now(),
  };
}

function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'wellington-long-price-feed/1.0',
          ...headers,
        },
        timeout: 10_000,
      },
      response => {
        const statusCode = response.statusCode ?? 0;
        const chunks: Buffer[] = [];

        response.on('data', chunk => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`HTTP ${statusCode}: ${body.slice(0, 200)}`));
            return;
          }

          try {
            resolve(JSON.parse(body) as T);
          } catch (error) {
            reject(new Error(`Invalid JSON response from ${url}: ${(error as Error).message}`));
          }
        });
      },
    );

    request.on('timeout', () => {
      request.destroy(new Error(`Timed out fetching ${url}`));
    });
    request.on('error', reject);
  });
}
