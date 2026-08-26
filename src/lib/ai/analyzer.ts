import type { Candle, Timeframe } from '@/lib/market/types';
import {
  ema,
  rsi,
  macd,
  bollingerBands,
  atr,
  sma,
  supportResistance,
  detectCandlestickPattern,
  detectMarketStructure,
} from '@/lib/indicators';
import type { SupportResistanceLevel } from '@/lib/indicators';

export type Trend = 'Bullish' | 'Bearish' | 'Sideways';
export type Signal = 'BUY' | 'SELL' | 'WAIT';
export type Sentiment = 'Very Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Very Bearish';

export interface IndicatorSet {
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  sma50: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  atr: number | null;
  volume: number;
  avgVolume: number | null;
}

export interface BullBearFactors {
  bullish: string[];
  bearish: string[];
  risks: string[];
  confirmations: string[];
}

export interface EntryScenario {
  entryMin: number;
  entryMax: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  riskReward: string;
}

export interface MultiTimeframeResult {
  timeframe: Timeframe;
  trend: Trend;
}

export interface AIAnalysis {
  symbol: string;
  timeframe: Timeframe;
  currentPrice: number;
  changePct: number;
  trend: Trend;
  signal: Signal;
  sentiment: Sentiment;
  confidence: number; // 0-100
  summary: string;
  factors: BullBearFactors;
  indicators: IndicatorSet;
  supportResistance: SupportResistanceLevel[];
  pattern: string;
  marketStructure: string;
  entry: EntryScenario | null;
  multiTimeframe: MultiTimeframeResult[];
}

function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

function computeIndicators(candles: Candle[]): IndicatorSet {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const rsiArr = rsi(closes, 14);
  const macdRes = macd(closes);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);
  const sma50 = sma(closes, 50);
  const bb = bollingerBands(closes, 20, 2);
  const atrArr = atr(candles, 14);
  const avgVolume = sma(volumes, 20);
  return {
    rsi: last(rsiArr) ?? null,
    macd: last(macdRes.macd) ?? null,
    macdSignal: last(macdRes.signal) ?? null,
    macdHistogram: last(macdRes.histogram) ?? null,
    ema20: last(ema20) ?? null,
    ema50: last(ema50) ?? null,
    ema200: last(ema200) ?? null,
    sma50: last(sma50) ?? null,
    bbUpper: last(bb.upper) ?? null,
    bbMiddle: last(bb.middle) ?? null,
    bbLower: last(bb.lower) ?? null,
    atr: last(atrArr) ?? null,
    volume: last(volumes) ?? 0,
    avgVolume: last(avgVolume) ?? null,
  };
}

function determineTrend(
  price: number,
  ind: IndicatorSet,
  structure: string,
): Trend {
  let score = 0;
  if (ind.ema20 !== null && ind.ema50 !== null) {
    if (ind.ema20 > ind.ema50) score += 1;
    else score -= 1;
  }
  if (ind.ema50 !== null && ind.ema200 !== null) {
    if (ind.ema50 > ind.ema200) score += 1;
    else score -= 1;
  }
  if (ind.sma50 !== null) {
    if (price > ind.sma50) score += 1;
    else score -= 1;
  }
  if (structure === 'higher_highs') score += 1;
  else if (structure === 'lower_lows') score -= 1;
  if (score >= 2) return 'Bullish';
  if (score <= -2) return 'Bearish';
  return 'Sideways';
}

function determineSentiment(
  trend: Trend,
  ind: IndicatorSet,
  price: number,
): Sentiment {
  let score = 0;
  if (trend === 'Bullish') score += 2;
  else if (trend === 'Bearish') score -= 2;
  if (ind.rsi !== null) {
    if (ind.rsi > 60) score += 1;
    else if (ind.rsi < 40) score -= 1;
    if (ind.rsi > 70) score += 0.5;
    else if (ind.rsi < 30) score -= 0.5;
  }
  if (ind.macd !== null && ind.macdSignal !== null) {
    if (ind.macd > ind.macdSignal) score += 1;
    else score -= 1;
  }
  if (ind.bbMiddle !== null) {
    if (price > ind.bbMiddle) score += 0.5;
    else score -= 0.5;
  }
  if (score >= 3.5) return 'Very Bullish';
  if (score >= 1.5) return 'Bullish';
  if (score <= -3.5) return 'Very Bearish';
  if (score <= -1.5) return 'Bearish';
  return 'Neutral';
}

function computeFactors(
  ind: IndicatorSet,
  price: number,
  trend: Trend,
  sr: SupportResistanceLevel[],
  pattern: string,
  structure: string,
): BullBearFactors {
  const bullish: string[] = [];
  const bearish: string[] = [];
  const risks: string[] = [];
  const confirmations: string[] = [];

  if (ind.ema20 !== null && ind.ema50 !== null) {
    if (ind.ema20 > ind.ema50) bullish.push('EMA 20 berada di atas EMA 50 (momentum jangka pendek bullish).');
    else bearish.push('EMA 20 berada di bawah EMA 50 (momentum jangka pendek bearish).');
  }
  if (ind.ema50 !== null && ind.ema200 !== null) {
    if (ind.ema50 > ind.ema200) bullish.push('EMA 50 di atas EMA 200 — tren jangka panjang bullish.');
    else bearish.push('EMA 50 di bawah EMA 200 — tren jangka panjang bearish.');
  }
  if (ind.sma50 !== null) {
    if (price > ind.sma50) bullish.push(`Harga (${fmt(price)}) berada di atas SMA 50 (${fmt(ind.sma50)}).`);
    else bearish.push(`Harga (${fmt(price)}) berada di bawah SMA 50 (${fmt(ind.sma50)}).`);
  }
  if (ind.rsi !== null) {
    if (ind.rsi > 70) {
      bearish.push(`RSI ${ind.rsi.toFixed(1)} — kondisi overbought, potensi koreksi.`);
      risks.push('RSI overbought dapat menyebabkan pullback jangka pendek.');
    } else if (ind.rsi < 30) {
      bullish.push(`RSI ${ind.rsi.toFixed(1)} — kondisi oversold, potensi rebound.`);
      risks.push('RSI oversold bisa tetap terus turun jika tren bearish kuat.');
    } else if (ind.rsi > 50) {
      bullish.push(`RSI ${ind.rsi.toFixed(1)} — di atas 50, bias bullish.`);
    } else {
      bearish.push(`RSI ${ind.rsi.toFixed(1)} — di bawah 50, bias bearish.`);
    }
  }
  if (ind.macd !== null && ind.macdSignal !== null) {
    if (ind.macd > ind.macdSignal) {
      bullish.push('MACD berada di atas signal line — momentum bullish.');
      if (ind.macdHistogram !== null && ind.macdHistogram > 0)
        bullish.push('Histogram MACD positif dan memperkuat sinyal bullish.');
    } else {
      bearish.push('MACD berada di bawah signal line — momentum bearish.');
      if (ind.macdHistogram !== null && ind.macdHistogram < 0)
        bearish.push('Histogram MACD negatif dan memperkuat sinyal bearish.');
    }
  }
  if (ind.bbUpper !== null && ind.bbLower !== null) {
    if (price >= ind.bbUpper * 0.998) {
      bearish.push(`Harga mendekati upper Bollinger Band (${fmt(ind.bbUpper)}) — area overbought.`);
      risks.push('Sentuhan upper band sering diikuti mean reversion ke middle band.');
    } else if (price <= ind.bbLower * 1.002) {
      bullish.push(`Harga mendekati lower Bollinger Band (${fmt(ind.bbLower)}) — area oversold.`);
    }
  }
  if (ind.avgVolume !== null && ind.avgVolume > 0) {
    const volRatio = ind.volume / ind.avgVolume;
    if (volRatio > 1.5) bullish.push(`Volume (${volRatio.toFixed(1)}x rata-rata) tinggi — mendukung pergerakan.`);
    else if (volRatio < 0.6) risks.push(`Volume (${volRatio.toFixed(1)}x rata-rata) rendah — kurang konfirmasi.`);
  }
  const nearestRes = sr.find((l) => l.distancePct > 0);
  const nearestSup = sr.find((l) => l.distancePct < 0);
  if (nearestRes) {
    bearish.push(`Resistance terdekat di ${fmt(nearestRes.level)} (${nearestRes.distancePct.toFixed(2)}%).`);
    confirmations.push(`Tunggu breakout di atas ${fmt(nearestRes.level)} dengan volume tinggi untuk konfirmasi bullish.`);
  }
  if (nearestSup) {
    bullish.push(`Support terdekat di ${fmt(nearestSup.level)} (${nearestSup.distancePct.toFixed(2)}%).`);
    confirmations.push(`Pantau apakah harga menahan di atas ${fmt(nearestSup.level)} sebagai konfirmasi.`);
  }
  if (pattern !== 'none') {
    const bullishPatterns = ['hammer', 'bullish_engulfing', 'morning_star'];
    const bearishPatterns = ['shooting_star', 'bearish_engulfing', 'evening_star'];
    if (bullishPatterns.includes(pattern)) bullish.push(`Pola candlestick ${pattern.replace('_', ' ')} terdeteksi — sinyal bullish.`);
    else if (bearishPatterns.includes(pattern)) bearish.push(`Pola candlestick ${pattern.replace('_', ' ')} terdeteksi — sinyal bearish.`);
    else confirmations.push(`Pola ${pattern.replace('_', ' ')} muncul — tunggu konfirmasi candle berikutnya.`);
  }
  if (structure === 'higher_highs') bullish.push('Struktur pasar membentuk higher highs & higher lows.');
  else if (structure === 'lower_lows') bearish.push('Struktur pasar membentuk lower lows & lower highs.');
  if (trend === 'Sideways') {
    risks.push('Tren sideways — sinyal kurang andal, hindari overtrading.');
    confirmations.push('Tunggu breakout dari range sideways sebelum mengambil posisi.');
  }
  return { bullish, bearish, risks, confirmations };
}

function computeSignal(
  trend: Trend,
  sentiment: Sentiment,
  ind: IndicatorSet,
  factors: BullBearFactors,
): { signal: Signal; confidence: number } {
  let score = 0;
  if (trend === 'Bullish') score += 2;
  else if (trend === 'Bearish') score -= 2;
  if (sentiment === 'Very Bullish') score += 2;
  else if (sentiment === 'Bullish') score += 1;
  else if (sentiment === 'Very Bearish') score -= 2;
  else if (sentiment === 'Bearish') score -= 1;
  score += (factors.bullish.length - factors.bearish.length) * 0.5;
  if (ind.rsi !== null) {
    if (ind.rsi > 75) score -= 1;
    else if (ind.rsi < 25) score += 1;
  }
  const confidence = Math.min(92, Math.max(35, Math.round(50 + score * 6)));
  let signal: Signal;
  if (score >= 2.5) signal = 'BUY';
  else if (score <= -2.5) signal = 'SELL';
  else signal = 'WAIT';
  return { signal, confidence };
}

function computeEntry(
  price: number,
  ind: IndicatorSet,
  trend: Trend,
  signal: Signal,
  sr: SupportResistanceLevel[],
): EntryScenario | null {
  if (signal === 'WAIT' || ind.atr === null) return null;
  const atrVal = ind.atr;
  const nearestSup = sr.find((l) => l.distancePct < 0);
  const nearestRes = sr.find((l) => l.distancePct > 0);
  if (signal === 'BUY') {
    const entryMin = nearestSup ? nearestSup.level : price - atrVal * 0.5;
    const entryMax = price;
    const stopLoss = entryMin - atrVal * 1.0;
    const risk = entryMax - stopLoss;
    const tp1 = entryMax + risk * 1.5;
    const tp2 = entryMax + risk * 2.5;
    const tp3 = entryMax + risk * 3.5;
    const rr = risk > 0 ? (tp2 - entryMax) / risk : 2;
    return {
      entryMin: round(entryMin),
      entryMax: round(entryMax),
      stopLoss: round(stopLoss),
      tp1: round(tp1),
      tp2: round(tp2),
      tp3: round(tp3),
      riskReward: `1:${rr.toFixed(1)}`,
    };
  } else {
    const entryMin = price;
    const entryMax = nearestRes ? nearestRes.level : price + atrVal * 0.5;
    const stopLoss = entryMax + atrVal * 1.0;
    const risk = stopLoss - entryMin;
    const tp1 = entryMin - risk * 1.5;
    const tp2 = entryMin - risk * 2.5;
    const tp3 = entryMin - risk * 3.5;
    const rr = risk > 0 ? (entryMin - tp2) / risk : 2;
    return {
      entryMin: round(entryMin),
      entryMax: round(entryMax),
      stopLoss: round(stopLoss),
      tp1: round(tp1),
      tp2: round(tp2),
      tp3: round(tp3),
      riskReward: `1:${rr.toFixed(1)}`,
    };
  }
}

function buildSummary(
  trend: Trend,
  sentiment: Sentiment,
  signal: Signal,
  ind: IndicatorSet,
  price: number,
  sr: SupportResistanceLevel[],
): string {
  const parts: string[] = [];
  if (trend === 'Bullish') parts.push('Tren utama masih bullish');
  else if (trend === 'Bearish') parts.push('Tren utama bearish');
  else parts.push('Tren pasar sideways / konsolidasi');

  if (ind.rsi !== null) {
    if (ind.rsi > 70) parts.push('namun RSI menunjukkan kondisi overbought yang dapat memicu koreksi');
    else if (ind.rsi < 30) parts.push('dengan RSI di area oversold yang berpotensi rebound');
    else if (ind.rsi > 50) parts.push('dengan momentum RSI di atas 50');
    else parts.push('dengan momentum RSI di bawah 50');
  }
  const nearestRes = sr.find((l) => l.distancePct > 0);
  const nearestSup = sr.find((l) => l.distancePct < 0);
  if (nearestRes && nearestRes.distancePct < 2)
    parts.push(`harga mendekati resistance ${fmt(nearestRes.level)} sehingga lebih baik menunggu konfirmasi breakout atau pullback`);
  else if (nearestSup && Math.abs(nearestSup.distancePct) < 2)
    parts.push(`harga mendekati support ${fmt(nearestSup.level)} — pantau reaksi harga di area ini`);
  if (signal === 'WAIT') parts.push('Sinyal WAIT — disarankan menunggu konfirmasi lebih lanjut sebelum entry.');
  else if (signal === 'BUY') parts.push('Sinyal BUY muncul dengan konfirmasi indikator bullish.');
  else parts.push('Sinyal SELL muncul dengan konfirmasi indikator bearish.');
  return parts.join(', ') + '.';
}

function fmt(n: number | null): string {
  if (n === null) return 'N/A';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}
function round(n: number): number {
  if (n >= 100) return Math.round(n * 100) / 100;
  if (n >= 1) return Math.round(n * 1000) / 1000;
  return Math.round(n * 1000000) / 1000000;
}

export function analyze(
  candles: Candle[],
  symbol: string,
  timeframe: Timeframe,
  multiCandles?: Record<Timeframe, Candle[]>,
): AIAnalysis {
  if (candles.length < 30) {
    throw new Error('Data pasar tidak cukup untuk analisis.');
  }
  const currentPrice = candles[candles.length - 1].close;
  const prevClose = candles[candles.length - 2]?.close ?? currentPrice;
  const changePct = ((currentPrice - prevClose) / prevClose) * 100;
  const ind = computeIndicators(candles);
  const structure = detectMarketStructure(candles);
  const sr = supportResistance(candles);
  const pattern = detectCandlestickPattern(candles);
  const trend = determineTrend(currentPrice, ind, structure);
  const sentiment = determineSentiment(trend, ind, currentPrice);
  const factors = computeFactors(ind, currentPrice, trend, sr, pattern, structure);
  const { signal, confidence } = computeSignal(trend, sentiment, ind, factors);
  const entry = computeEntry(currentPrice, ind, trend, signal, sr);
  const summary = buildSummary(trend, sentiment, signal, ind, currentPrice, sr);

  const multiTimeframe: MultiTimeframeResult[] = [];
  if (multiCandles) {
    for (const [tf, tfCandles] of Object.entries(multiCandles)) {
      if (tfCandles.length >= 30) {
        const tfInd = computeIndicators(tfCandles);
        const tfStructure = detectMarketStructure(tfCandles);
        const tfTrend = determineTrend(tfCandles[tfCandles.length - 1].close, tfInd, tfStructure);
        multiTimeframe.push({ timeframe: tf as Timeframe, trend: tfTrend });
      }
    }
  }

  return {
    symbol,
    timeframe,
    currentPrice,
    changePct,
    trend,
    signal,
    sentiment,
    confidence,
    summary,
    factors,
    indicators: ind,
    supportResistance: sr,
    pattern: pattern.replace('_', ' '),
    marketStructure: structure.replace('_', ' '),
    entry,
    multiTimeframe,
  };
}
