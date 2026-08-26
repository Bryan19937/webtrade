import { useEffect, useState, useCallback } from 'react';
import { marketProvider } from '@/lib/market/provider';
import type { Candle, Timeframe } from '@/lib/market/types';
import { ema, bollingerBands } from '@/lib/indicators';

export interface ChartData {
  candles: Candle[];
  ema20: (number | null)[];
  ema50: (number | null)[];
  ema200: (number | null)[];
  bbUpper: (number | null)[];
  bbMiddle: (number | null)[];
  bbLower: (number | null)[];
}

export function useMarketData(symbol: string, timeframe: Timeframe, limit = 300) {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const candles = await marketProvider.getCandles(symbol, timeframe, limit);
      const closes = candles.map((c) => c.close);
      setData({
        candles,
        ema20: ema(closes, 20),
        ema50: ema(closes, 50),
        ema200: ema(closes, 200),
        bbUpper: bollingerBands(closes, 20, 2).upper,
        bbMiddle: bollingerBands(closes, 20, 2).middle,
        bbLower: bollingerBands(closes, 20, 2).lower,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data pasar.');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function useMultiTimeframeData(symbol: string, timeframes: Timeframe[]) {
  const [multi, setMulti] = useState<Record<string, Candle[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const result: Record<string, Candle[]> = {};
      for (const tf of timeframes) {
        try {
          result[tf] = await marketProvider.getCandles(symbol, tf, 200);
        } catch {
          result[tf] = [];
        }
      }
      if (!cancelled) {
        setMulti(result);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [symbol, timeframes.join(',')]);

  return { multi, loading };
}
