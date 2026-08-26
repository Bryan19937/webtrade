import type { Candle, Timeframe } from '@/lib/market/types';
import { ema, rsi, macd } from '@/lib/indicators';

export type Strategy = 'ema_cross' | 'rsi_reversion' | 'macd_crossover';

export interface BacktestConfig {
  symbol: string;
  timeframe: Timeframe;
  strategy: Strategy;
  initialCapital: number;
  period: string; // e.g. "6M"
}

export interface BacktestTrade {
  entryIndex: number;
  exitIndex: number;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  win: boolean;
}

export interface BacktestResult {
  symbol: string;
  timeframe: Timeframe;
  strategy: Strategy;
  period: string;
  initialCapital: number;
  finalCapital: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  lossRate: number;
  maxDrawdown: number;
  riskReward: number;
  equityCurve: { index: number; equity: number }[];
  trades: BacktestTrade[];
  totalPnlPct: number;
}

const PERIOD_BARS: Record<string, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  'ALL': 500,
};

function generateSignals(
  candles: Candle[],
  strategy: Strategy,
): ('long' | 'short' | null)[] {
  const closes = candles.map((c) => c.close);
  const signals: ('long' | 'short' | null)[] = new Array(candles.length).fill(null);
  if (strategy === 'ema_cross') {
    const fast = ema(closes, 9);
    const slow = ema(closes, 21);
    for (let i = 1; i < candles.length; i++) {
      if (fast[i] === null || slow[i] === null || fast[i - 1] === null || slow[i - 1] === null)
        continue;
      if (fast[i - 1]! <= slow[i - 1]! && fast[i]! > slow[i]!) signals[i] = 'long';
      else if (fast[i - 1]! >= slow[i - 1]! && fast[i]! < slow[i]!) signals[i] = 'short';
    }
  } else if (strategy === 'rsi_reversion') {
    const rsiArr = rsi(closes, 14);
    for (let i = 1; i < candles.length; i++) {
      if (rsiArr[i] === null || rsiArr[i - 1] === null) continue;
      if (rsiArr[i - 1]! <= 30 && rsiArr[i]! > 30) signals[i] = 'long';
      else if (rsiArr[i - 1]! >= 70 && rsiArr[i]! < 70) signals[i] = 'short';
    }
  } else if (strategy === 'macd_crossover') {
    const m = macd(closes);
    for (let i = 1; i < candles.length; i++) {
      if (m.macd[i] === null || m.signal[i] === null || m.macd[i - 1] === null || m.signal[i - 1] === null)
        continue;
      if (m.macd[i - 1]! <= m.signal[i - 1]! && m.macd[i]! > m.signal[i]!) signals[i] = 'long';
      else if (m.macd[i - 1]! >= m.signal[i - 1]! && m.macd[i]! < m.signal[i]!) signals[i] = 'short';
    }
  }
  return signals;
}

export function runBacktest(candles: Candle[], config: BacktestConfig): BacktestResult {
  const bars = PERIOD_BARS[config.period] ?? 180;
  const series = candles.slice(-bars);
  if (series.length < 50) {
    throw new Error('Data historis tidak cukup untuk backtest pada periode ini.');
  }
  const signals = generateSignals(series, config.strategy);

  let capital = config.initialCapital;
  let position: { side: 'long' | 'short'; entry: number; size: number; entryIndex: number } | null = null;
  const trades: BacktestTrade[] = [];
  const equityCurve: { index: number; equity: number }[] = [];
  let peak = capital;
  let maxDrawdown = 0;
  let totalRisk = 0;
  let totalReward = 0;

  for (let i = 0; i < series.length; i++) {
    const candle = series[i];
    // Close existing position on opposite signal
    if (position && signals[i] && signals[i] !== position.side) {
      const exitPrice = candle.close;
      const pnl =
        position.side === 'long'
          ? (exitPrice - position.entry) * position.size
          : (position.entry - exitPrice) * position.size;
      capital += pnl;
      const pnlPct = (pnl / config.initialCapital) * 100;
      const risk = Math.abs(position.entry - exitPrice);
      const reward = Math.abs(pnl);
      totalRisk += risk * position.size;
      totalReward += reward;
      trades.push({
        entryIndex: position.entryIndex,
        exitIndex: i,
        side: position.side,
        entryPrice: position.entry,
        exitPrice,
        pnl,
        pnlPct,
        win: pnl > 0,
      });
      position = null;
    }
    // Open new position
    if (!position && signals[i]) {
      const side = signals[i]!;
      const size = capital / candle.close;
      position = { side, entry: candle.close, size, entryIndex: i };
    }
    // Track equity
    let equity = capital;
    if (position) {
      equity +=
        position.side === 'long'
          ? (candle.close - position.entry) * position.size
          : (position.entry - candle.close) * position.size;
    }
    equityCurve.push({ index: i, equity });
    if (equity > peak) peak = equity;
    const dd = ((peak - equity) / peak) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }
  // Close any open position at the end
  if (position) {
    const exitPrice = series[series.length - 1].close;
    const pnl =
      position.side === 'long'
        ? (exitPrice - position.entry) * position.size
        : (position.entry - exitPrice) * position.size;
    capital += pnl;
    const pnlPct = (pnl / config.initialCapital) * 100;
    trades.push({
      entryIndex: position.entryIndex,
      exitIndex: series.length - 1,
      side: position.side,
      entryPrice: position.entry,
      exitPrice,
      pnl,
      pnlPct,
      win: pnl > 0,
    });
  }

  const wins = trades.filter((t) => t.win).length;
  const losses = trades.length - wins;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
  const lossRate = trades.length > 0 ? (losses / trades.length) * 100 : 0;
  const riskReward = totalRisk > 0 ? totalReward / totalRisk : 0;
  const totalPnlPct = ((capital - config.initialCapital) / config.initialCapital) * 100;

  return {
    symbol: config.symbol,
    timeframe: config.timeframe,
    strategy: config.strategy,
    period: config.period,
    initialCapital: config.initialCapital,
    finalCapital: capital,
    totalTrades: trades.length,
    wins,
    losses,
    winRate,
    lossRate,
    maxDrawdown,
    riskReward,
    equityCurve,
    trades,
    totalPnlPct,
  };
}
