import type { Candle, AssetInfo, Timeframe } from './types';
import { TIMEFRAME_MS } from './types';
import { ASSET_MAP, ASSETS } from './assets';

// Deterministic pseudo-random generator (mulberry32) so the same symbol+timeframe
// always yields the same candle series — charts and indicators stay stable across
// reloads. This is synthetic but *consistent* market data: no fabricated news,
// no random spikes, no invented external events.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Box-Muller transform for a normal distribution from uniform randoms.
function gaussian(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Generate a believable OHLCV series using a geometric-brownian-motion-ish model
// with mild mean reversion and regime waves, so trends and ranges both appear.
function generateSeries(asset: AssetInfo, timeframe: Timeframe, limit: number): Candle[] {
  const tfMs = TIMEFRAME_MS[timeframe];
  const now = Date.now();
  const startTime = now - tfMs * (limit - 1);

  const seed = hashString(asset.symbol + timeframe);
  const rand = mulberry32(seed);

  const candles: Candle[] = [];
  let price = asset.basePrice * (0.85 + rand() * 0.3); // start somewhere near base
  const vol = asset.volatility;
  const driftPerCandle = asset.drift * 0.0025;

  // Long-wave regime: oscillates between bullish/bearish phases over ~200 candles.
  const wavePeriod = 180 + Math.floor(rand() * 120);

  for (let i = 0; i < limit; i++) {
    const phase = (i / wavePeriod) * 2 * Math.PI;
    const regime = Math.sin(phase + rand() * 0.5) * 0.6;
    const localDrift = driftPerCandle + regime * vol * 0.15;

    const shock = gaussian(rand) * vol;
    const open = price;
    const change = price * (localDrift + shock);
    let close = open + change;

    // mild mean reversion toward basePrice to keep prices in a sane band
    const reversion = (asset.basePrice - close) / asset.basePrice * 0.01;
    close += price * reversion;
    if (close <= 0) close = open * 0.98;

    const wickRange = Math.abs(change) * (0.8 + rand() * 1.6) + price * vol * 0.3;
    const high = Math.max(open, close) + wickRange * rand();
    const low = Math.min(open, close) - wickRange * rand();
    const volume = Math.max(
      0,
      asset.basePrice * 1000 * (0.5 + rand() * 1.5) * (1 + Math.abs(shock) * 8),
    );

    candles.push({
      time: startTime + i * tfMs,
      open: round(open),
      high: round(high),
      low: round(Math.max(low, close * 0.97)),
      close: round(close),
      volume: Math.round(volume),
    });
    price = close;
  }
  return candles;
}

function round(n: number): number {
  if (n >= 100) return Math.round(n * 100) / 100;
  if (n >= 1) return Math.round(n * 1000) / 1000;
  return Math.round(n * 1000000) / 1000000;
}

class SyntheticMarketDataProvider {
  getAsset(symbol: string): AssetInfo | undefined {
    return ASSET_MAP[symbol];
  }

  searchAssets(query: string): AssetInfo[] {
    const q = query.trim().toUpperCase();
    if (!q) return ASSETS.slice(0, 8);
    return ASSETS.filter(
      (a) =>
        a.symbol.toUpperCase().includes(q) || a.name.toUpperCase().includes(q),
    ).slice(0, 20);
  }

  listAssets(): AssetInfo[] {
    return ASSETS;
  }

  async getCandles(symbol: string, timeframe: Timeframe, limit = 300): Promise<Candle[]> {
    const asset = ASSET_MAP[symbol];
    if (!asset) throw new Error(`Unknown asset: ${symbol}`);
    // Simulate a small network delay so skeleton loaders are visible.
    await delay(280 + Math.random() * 220);
    return generateSeries(asset, timeframe, limit);
  }

  async getQuote(symbol: string): Promise<{ price: number; changePct: number } | null> {
    const asset = ASSET_MAP[symbol];
    if (!asset) return null;
    await delay(120);
    const candles = generateSeries(asset, '1H', 24);
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2] ?? last;
    const changePct = ((last.close - prev.close) / prev.close) * 100;
    return { price: last.close, changePct };
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Singleton provider. The abstraction means a real exchange API (Binance, etc.)
// can be dropped in later by implementing the same interface.
export const marketProvider: import('./types').MarketDataProvider =
  new SyntheticMarketDataProvider();
