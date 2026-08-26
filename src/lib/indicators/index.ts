import type { Candle } from '@/lib/market/types';

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (prev === null) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += values[j];
      prev = sum / period;
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = [];
  let gains = 0;
  let losses = 0;
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      out.push(null);
      continue;
    }
    const change = values[i] - values[i - 1];
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);
    if (i <= period) {
      gains += gain;
      losses += loss;
      if (i === period) {
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        out.push(100 - 100 / (1 + rs));
      } else {
        out.push(null);
      }
    } else {
      gains = (gains * (period - 1) + gain) / period;
      losses = (losses * (period - 1) + loss) / period;
      const rs = losses === 0 ? 100 : gains / losses;
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
}

export interface MacdResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9): MacdResult {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const macdLine: (number | null)[] = values.map((_, i) => {
    if (fastEma[i] === null || slowEma[i] === null) return null;
    return (fastEma[i] as number) - (slowEma[i] as number);
  });
  const validMacd = macdLine.map((v) => (v === null ? 0 : v));
  const signalRaw = ema(validMacd, signalPeriod);
  const signal = macdLine.map((v, i) => (v === null ? null : signalRaw[i]));
  const histogram = macdLine.map((v, i) => {
    if (v === null || signal[i] === null) return null;
    return v - (signal[i] as number);
  });
  return { macd: macdLine, signal, histogram };
}

export interface BollingerResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export function bollingerBands(values: number[], period = 20, mult = 2): BollingerResult {
  const middle = sma(values, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1 || middle[i] === null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    let sumSq = 0;
    const mean = middle[i] as number;
    for (let j = i - period + 1; j <= i; j++) {
      sumSq += (values[j] - mean) ** 2;
    }
    const std = Math.sqrt(sumSq / period);
    upper.push(mean + mult * std);
    lower.push(mean - mult * std);
  }
  return { upper, middle, lower };
}

export function atr(candles: Candle[], period = 14): (number | null)[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
      continue;
    }
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  // Wilder's smoothing
  const out: (number | null)[] = [];
  let prev: number | null = null;
  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (prev === null) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += tr[j];
      prev = sum / period;
    } else {
      prev = (prev * (period - 1) + tr[i]) / period;
    }
    out.push(prev);
  }
  return out;
}

export interface SupportResistanceLevel {
  level: number;
  type: 'strong_support' | 'weak_support' | 'strong_resistance' | 'weak_resistance';
  strength: number; // number of touches
  distancePct: number; // distance from current price as %
}

// Detect S/R by clustering pivot highs/lows. Strength = touch count.
export function supportResistance(candles: Candle[], lookback = 60): SupportResistanceLevel[] {
  if (candles.length < 10) return [];
  const currentPrice = candles[candles.length - 1].close;
  const window = candles.slice(-lookback);
  const pivots: { price: number; type: 'high' | 'low' }[] = [];
  const left = 3;
  const right = 3;
  for (let i = left; i < window.length - right; i++) {
    const c = window[i];
    let isHigh = true;
    let isLow = true;
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue;
      if (window[j].high >= c.high) isHigh = false;
      if (window[j].low <= c.low) isLow = false;
    }
    if (isHigh) pivots.push({ price: c.high, type: 'high' });
    if (isLow) pivots.push({ price: c.low, type: 'low' });
  }

  // Cluster pivots within 0.6% tolerance.
  const tolerance = currentPrice * 0.006;
  const clusters: { price: number; type: 'high' | 'low'; count: number }[] = [];
  for (const p of pivots) {
    const existing = clusters.find((c) => Math.abs(c.price - p.price) < tolerance);
    if (existing) {
      existing.count += 1;
      existing.price = (existing.price * (existing.count - 1) + p.price) / existing.count;
    } else {
      clusters.push({ price: p.price, type: p.type, count: 1 });
    }
  }

  const levels: SupportResistanceLevel[] = clusters
    .filter((c) => c.count >= 1)
    .map((c) => {
      const distancePct = ((c.price - currentPrice) / currentPrice) * 100;
      const strong = c.count >= 3;
      let type: SupportResistanceLevel['type'];
      if (c.price < currentPrice) type = strong ? 'strong_support' : 'weak_support';
      else type = strong ? 'strong_resistance' : 'weak_resistance';
      return { level: c.price, type, strength: c.count, distancePct };
    })
    .sort((a, b) => Math.abs(a.distancePct) - Math.abs(b.distancePct))
    .slice(0, 8);

  return levels;
}

export type CandlestickPattern =
  | 'doji'
  | 'hammer'
  | 'shooting_star'
  | 'bullish_engulfing'
  | 'bearish_engulfing'
  | 'morning_star'
  | 'evening_star'
  | 'none';

export function detectCandlestickPattern(candles: Candle[]): CandlestickPattern {
  if (candles.length < 3) return 'none';
  const [c1, c2, c3] = candles.slice(-3);
  const body = (c: Candle) => Math.abs(c.close - c.open);
  const range = (c: Candle) => c.high - c.low || 1e-9;
  const upperWick = (c: Candle) => c.high - Math.max(c.open, c.close);
  const lowerWick = (c: Candle) => Math.min(c.open, c.close) - c.low;

  // Doji
  if (body(c3) / range(c3) < 0.1) return 'doji';
  // Hammer
  if (lowerWick(c3) > body(c3) * 2 && upperWick(c3) < body(c3) * 0.6 && c3.close > c3.open)
    return 'hammer';
  // Shooting star
  if (upperWick(c3) > body(c3) * 2 && lowerWick(c3) < body(c3) * 0.6 && c3.close < c3.open)
    return 'shooting_star';
  // Bullish engulfing
  if (c2.close < c2.open && c3.close > c3.open && c3.close > c2.open && c3.open < c2.close)
    return 'bullish_engulfing';
  // Bearish engulfing
  if (c2.close > c2.open && c3.close < c3.open && c3.close < c2.open && c3.open > c2.close)
    return 'bearish_engulfing';
  // Morning star
  if (
    c1.close < c1.open &&
    body(c2) < body(c1) * 0.5 &&
    c3.close > c3.open &&
    c3.close > (c1.open + c1.close) / 2
  )
    return 'morning_star';
  // Evening star
  if (
    c1.close > c1.open &&
    body(c2) < body(c1) * 0.5 &&
    c3.close < c3.open &&
    c3.close < (c1.open + c1.close) / 2
  )
    return 'evening_star';
  return 'none';
}

export type MarketStructure = 'higher_highs' | 'lower_lows' | 'range';

export function detectMarketStructure(candles: Candle[], lookback = 30): MarketStructure {
  if (candles.length < lookback) return 'range';
  const window = candles.slice(-lookback);
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = 2; i < window.length - 2; i++) {
    const c = window[i];
    if (
      c.high > window[i - 1].high &&
      c.high > window[i - 2].high &&
      c.high > window[i + 1].high &&
      c.high > window[i + 2].high
    )
      highs.push(c.high);
    if (
      c.low < window[i - 1].low &&
      c.low < window[i - 2].low &&
      c.low < window[i + 1].low &&
      c.low < window[i + 2].low
    )
      lows.push(c.low);
  }
  if (highs.length >= 2 && lows.length >= 2) {
    const hh = highs[highs.length - 1] > highs[0];
    const hl = lows[lows.length - 1] > lows[0];
    const lh = highs[highs.length - 1] < highs[0];
    const ll = lows[lows.length - 1] < lows[0];
    if (hh && hl) return 'higher_highs';
    if (lh && ll) return 'lower_lows';
  }
  return 'range';
}
