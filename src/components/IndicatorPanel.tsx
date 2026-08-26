import type { IndicatorSet } from '@/lib/ai/analyzer';
import { Card, CardHeader } from '@/components/ui';

export function IndicatorPanel({ ind }: { ind: IndicatorSet }) {
  const rsiColor = ind.rsi === null ? 'text-slate-400' : ind.rsi > 70 ? 'text-red-400' : ind.rsi < 30 ? 'text-emerald-400' : 'text-slate-200';
  const macdBullish = ind.macd !== null && ind.macdSignal !== null && ind.macd > ind.macdSignal;
  return (
    <Card>
      <CardHeader title="Indikator Teknikal" subtitle="Nilai terbaru dari setiap indikator" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <IndicatorRow label="RSI (14)" value={ind.rsi?.toFixed(1) ?? 'N/A'} valueClass={rsiColor} />
        <IndicatorRow
          label="MACD"
          value={ind.macd?.toFixed(4) ?? 'N/A'}
          sub={`Signal: ${ind.macdSignal?.toFixed(4) ?? 'N/A'}`}
          valueClass={macdBullish ? 'text-emerald-400' : 'text-red-400'}
        />
        <IndicatorRow label="EMA 20" value={fmt(ind.ema20)} />
        <IndicatorRow label="EMA 50" value={fmt(ind.ema50)} />
        <IndicatorRow label="EMA 200" value={fmt(ind.ema200)} />
        <IndicatorRow label="SMA 50" value={fmt(ind.sma50)} />
        <IndicatorRow label="BB Upper" value={fmt(ind.bbUpper)} />
        <IndicatorRow label="BB Middle" value={fmt(ind.bbMiddle)} />
        <IndicatorRow label="BB Lower" value={fmt(ind.bbLower)} />
        <IndicatorRow label="ATR (14)" value={fmt(ind.atr)} />
        <IndicatorRow
          label="Volume"
          value={ind.volume.toLocaleString()}
          sub={`Avg: ${ind.avgVolume?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? 'N/A'}`}
        />
      </div>
    </Card>
  );
}

function IndicatorRow({ label, value, sub, valueClass = 'text-slate-200' }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${valueClass}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600">{sub}</p>}
    </div>
  );
}

function fmt(n: number | null): string {
  if (n === null) return 'N/A';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}
