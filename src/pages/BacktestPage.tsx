import { useState, useMemo } from 'react';
import { marketProvider } from '@/lib/market/provider';
import { useMarketData } from '@/hooks/useMarketData';
import { runBacktest, type BacktestConfig, type BacktestResult, type Strategy } from '@/lib/backtest/engine';
import { AssetSearch } from '@/components/AssetSearch';
import { Card, CardHeader, Skeleton, ErrorState, Badge, Disclaimer, LoadingSpinner } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { FlaskConical, Save, TrendingUp, TrendingDown } from 'lucide-react';
import type { AssetInfo, Timeframe } from '@/lib/market/types';

const STRATEGIES: { id: Strategy; label: string; desc: string }[] = [
  { id: 'ema_cross', label: 'EMA Crossover', desc: 'Beli saat EMA 9 crossing di atas EMA 21, jual saat sebaliknya' },
  { id: 'rsi_reversion', label: 'RSI Reversion', desc: 'Beli saat RSI keluar dari oversold, jual saat keluar dari overbought' },
  { id: 'macd_crossover', label: 'MACD Crossover', desc: 'Beli saat MACD crossing di atas signal line, jual saat sebaliknya' },
];
const PERIODS = ['1M', '3M', '6M', '1Y', 'ALL'];

export function BacktestPage() {
  const [asset, setAsset] = useState<AssetInfo>(() => marketProvider.listAssets()[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const [strategy, setStrategy] = useState<Strategy>('ema_cross');
  const [period, setPeriod] = useState('6M');
  const [capital, setCapital] = useState(10000);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data, loading, error, reload } = useMarketData(asset.symbol, timeframe, 500);

  const runIt = async () => {
    if (!data || data.candles.length < 50) return;
    setRunning(true);
    await new Promise((r) => setTimeout(r, 600));
    try {
      const config: BacktestConfig = {
        symbol: asset.symbol,
        timeframe,
        strategy,
        period,
        initialCapital: capital,
      };
      const res = runBacktest(data.candles, config);
      setResult(res);
    } catch (e) {
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  const saveResult = async () => {
    if (!result) return;
    try {
      await supabase.from('backtest_results').insert({
        symbol: result.symbol,
        timeframe: result.timeframe,
        strategy: result.strategy,
        period: result.period,
        initial_capital: result.initialCapital,
        final_capital: result.finalCapital,
        total_trades: result.totalTrades,
        win_rate: result.winRate,
        loss_rate: result.lossRate,
        max_drawdown: result.maxDrawdown,
        risk_reward: result.riskReward,
        equity_curve: result.equityCurve,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <FlaskConical className="h-5 w-5 text-emerald-400" /> Backtesting
        </h2>
        <p className="text-sm text-slate-500">Uji strategi trading menggunakan data historis nyata</p>
      </div>

      {/* Config */}
      <Card>
        <CardHeader title="Konfigurasi Backtest" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="text-xs text-slate-500">Aset</label>
            <div className="mt-1"><AssetSearch onSelect={setAsset} selected={asset.symbol} /></div>
          </div>
          <div>
            <label className="text-xs text-slate-500">Timeframe</label>
            <div className="mt-1 flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
              {(['1H', '4H', '1D', '1W'] as Timeframe[]).map((tf) => (
                <button key={tf} onClick={() => setTimeframe(tf)} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${timeframe === tf ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}>
                  {tf}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">Periode</label>
            <div className="mt-1 flex gap-1">
              {PERIODS.map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium ${period === p ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 text-slate-400 hover:text-slate-200'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">Modal Simulasi ($)</label>
            <input type="number" value={capital} onChange={(e) => setCapital(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none" />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs text-slate-500">Strategi</label>
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            {STRATEGIES.map((s) => (
              <button key={s.id} onClick={() => setStrategy(s.id)} className={`rounded-lg border p-3 text-left transition-colors ${strategy === s.id ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-slate-800 hover:border-slate-700'}`}>
                <p className={`text-sm font-semibold ${strategy === s.id ? 'text-emerald-400' : 'text-slate-200'}`}>{s.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={runIt} disabled={running || loading} className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50">
            {running ? 'Menjalankan...' : 'Jalankan Backtest'}
          </button>
          {result && (
            <button onClick={saveResult} className={`flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm transition-colors ${saved ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}>
              <Save className="h-4 w-4" /> {saved ? 'Tersimpan' : 'Simpan Hasil'}
            </button>
          )}
        </div>
      </Card>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : running ? (
        <Card><LoadingSpinner label="Menjalankan backtest pada data historis..." /></Card>
      ) : result ? (
        <BacktestResultView result={result} />
      ) : null}

      <Disclaimer />
    </div>
  );
}

function BacktestResultView({ result }: { result: BacktestResult }) {
  const profit = result.finalCapital >= result.initialCapital;
  const maxEquity = Math.max(...result.equityCurve.map((e) => e.equity));
  const minEquity = Math.min(...result.equityCurve.map((e) => e.equity));
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Final Capital" value={`$${result.finalCapital.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} positive={profit} />
        <StatCard label="Total P/L" value={`${profit ? '+' : ''}${result.totalPnlPct.toFixed(2)}%`} positive={profit} />
        <StatCard label="Win Rate" value={`${result.winRate.toFixed(1)}%`} positive={result.winRate >= 50} />
        <StatCard label="Total Trades" value={String(result.totalTrades)} />
        <StatCard label="Wins / Losses" value={`${result.wins} / ${result.losses}`} />
        <StatCard label="Loss Rate" value={`${result.lossRate.toFixed(1)}%`} positive={result.lossRate < 50} />
        <StatCard label="Max Drawdown" value={`-${result.maxDrawdown.toFixed(2)}%`} positive={false} />
        <StatCard label="Risk/Reward" value={`1:${result.riskReward.toFixed(2)}`} />
      </div>

      {/* Equity curve */}
      <Card>
        <CardHeader title="Equity Curve" subtitle={`Modal awal $${result.initialCapital.toLocaleString()}`} />
        <EquityCurve equityCurve={result.equityCurve} min={minEquity} max={maxEquity} />
      </Card>

      {/* Trades */}
      <Card>
        <CardHeader title="Riwayat Trade" subtitle={`${result.totalTrades} trade dieksekusi`} />
        {result.trades.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Tidak ada trade yang dieksekusi pada periode ini dengan strategi yang dipilih.</p>
        ) : (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900/90">
                <tr className="text-left text-xs text-slate-500">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Side</th>
                  <th className="pb-2 pr-4">Entry</th>
                  <th className="pb-2 pr-4">Exit</th>
                  <th className="pb-2 pr-4">P/L</th>
                  <th className="pb-2">P/L %</th>
                </tr>
              </thead>
              <tbody>
                {result.trades.map((t, i) => (
                  <tr key={i} className="border-t border-slate-800/50">
                    <td className="py-2 pr-4 text-slate-500">{i + 1}</td>
                    <td className="py-2 pr-4">
                      <Badge color={t.side === 'long' ? 'green' : 'red'}>{t.side === 'long' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {t.side}</Badge>
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-slate-300">{fmt(t.entryPrice)}</td>
                    <td className="py-2 pr-4 tabular-nums text-slate-300">{fmt(t.exitPrice)}</td>
                    <td className={`py-2 pr-4 tabular-nums ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}</td>
                    <td className={`py-2 tabular-nums ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t.pnl >= 0 ? '+' : ''}{t.pnlPct.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function StatCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  const color = positive === undefined ? 'text-slate-200' : positive ? 'text-emerald-400' : 'text-red-400';
  return (
    <Card>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${color}`}>{value}</p>
    </Card>
  );
}

function EquityCurve({ equityCurve, min, max }: { equityCurve: { index: number; equity: number }[]; min: number; max: number }) {
  const w = 800;
  const h = 200;
  const range = max - min || 1;
  const denom = equityCurve.length > 1 ? equityCurve.length - 1 : 1;
  const points = equityCurve.map((e, i) => {
    const x = (i / denom) * w;
    const y = h - ((e.equity - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  const initialEquity = equityCurve[0]?.equity ?? 0;
  const initialY = h - ((initialEquity - min) / range) * h;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-48 w-full" preserveAspectRatio="none">
      <line x1="0" y1={initialY} x2={w} y2={initialY} stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />
      <polyline points={points} fill="none" stroke="#10b981" strokeWidth="1.5" />
    </svg>
  );
}

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}
