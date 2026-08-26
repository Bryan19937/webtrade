export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D' | '1W';

export interface Candle {
  time: number; // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AssetInfo {
  symbol: string;
  name: string;
  market: 'crypto' | 'forex' | 'stocks' | 'metals';
  basePrice: number;
  volatility: number; // relative per-candle volatility
  drift: number; // per-candle drift bias (-1..1)
}

export interface MarketDataProvider {
  getAsset(symbol: string): AssetInfo | undefined;
  searchAssets(query: string): AssetInfo[];
  listAssets(): AssetInfo[];
  getCandles(symbol: string, timeframe: Timeframe, limit: number): Promise<Candle[]>;
  getQuote(symbol: string): Promise<{ price: number; changePct: number } | null>;
}

export const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1H', '4H', '1D', '1W'];

export const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1H': 3_600_000,
  '4H': 14_400_000,
  '1D': 86_400_000,
  '1W': 604_800_000,
};
