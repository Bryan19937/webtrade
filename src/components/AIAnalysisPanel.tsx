import { useMemo } from 'react';
import type { AIAnalysis } from '@/lib/ai/analyzer';
import { Badge, Card, CardHeader } from '@/components/ui';
import { TrendingUp, TrendingDown, Minus, Target, Shield, AlertTriangle, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export function SignalBadge({ signal }: { signal: AIAnalysis['signal'] }) {
  if (signal === 'BUY') return <Badge color="green"><TrendingUp className="h-3 w-3" /> BUY</Badge>;
  if (signal === 'SELL') return <Badge color="red"><TrendingDown className="h-3 w-3" /> SELL</Badge>;
  return <Badge color="amber"><Minus className="h-3 w-3" /> WAIT</Badge>;
}

export function TrendBadge({ trend }: { trend: AIAnalysis['trend'] }) {
  if (trend === 'Bullish') return <Badge color="green">Bullish</Badge>;
  if (trend === 'Bearish') return <Badge color="red">Bearish</Badge>;
  return <Badge color="slate">Sideways</Badge>;
}

export function SentimentBadge({ sentiment }: { sentiment: AIAnalysis['sentiment'] }) {
  const map: Record<string, 'green' | 'red' | 'slate' | 'amber'> = {
    'Very Bullish': 'green',
    'Bullish': 'green',
    'Neutral': 'slate',
    'Bearish': 'red',
    'Very Bearish': 'red',
  };
  return <Badge color={map[sentiment] ?? 'slate'}>{sentiment}</Badge>;
}

export function ConfidenceBar({ confidence }: { confidence: number }) {
  const color = confidence >= 70 ? 'bg-emerald-500' : confidence >= 50 ? 'bg-amber-500' : 'bg-slate-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${confidence}%` }} />
      </div>
      <span className="text-sm font-semibold text-slate-200">{confidence}%</span>
    </div>
  );
}

export function AIAnalysisPanel({ analysis }: { analysis: AIAnalysis }) {
  const factors = analysis.factors;
  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader title="Kesimpulan AI" subtitle={`${analysis.symbol} · ${analysis.timeframe}`} action={<SignalBadge signal={analysis.signal} />} />
        <p className="text-sm leading-relaxed text-slate-300">{analysis.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TrendBadge trend={analysis.trend} />
          <SentimentBadge sentiment={analysis.sentiment} />
          <Badge color="slate">Pattern: {analysis.pattern}</Badge>
          <Badge color="slate">Structure: {analysis.marketStructure}</Badge>
        </div>
      </Card>

      {/* Confidence */}
      <Card>
        <CardHeader title="AI Confidence" subtitle="Tingkat keyakinan analisis berdasarkan konvergensi indikator" />
        <ConfidenceBar confidence={analysis.confidence} />
        <p className="mt-2 text-xs text-slate-500">
          Confidence bukan probabilitas pasti harga akan naik atau turun. Ini mengukur seberapa kuat konvergensi sinyal dari indikator yang tersedia.
        </p>
      </Card>

      {/* Factors */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Faktor Bullish" action={<CheckCircle2 className="h-4 w-4 text-emerald-400" />} />
          {factors.bullish.length ? (
            <ul className="space-y-1.5">
              {factors.bullish.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400">+</span> {f}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">Tidak ada faktor bullish yang signifikan.</p>}
        </Card>
        <Card>
          <CardHeader title="Faktor Bearish" action={<XCircle className="h-4 w-4 text-red-400" />} />
          {factors.bearish.length ? (
            <ul className="space-y-1.5">
              {factors.bearish.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300">
                  <span className="text-red-400">−</span> {f}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">Tidak ada faktor bearish yang signifikan.</p>}
        </Card>
        <Card>
          <CardHeader title="Faktor Risiko" action={<AlertTriangle className="h-4 w-4 text-amber-400" />} />
          {factors.risks.length ? (
            <ul className="space-y-1.5">
              {factors.risks.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" /> {f}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">Tidak ada risiko khusus teridentifikasi.</p>}
        </Card>
        <Card>
          <CardHeader title="Kondisi yang Harus Dikonfirmasi" action={<Target className="h-4 w-4 text-sky-400" />} />
          {factors.confirmations.length ? (
            <ul className="space-y-1.5">
              {factors.confirmations.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-sky-400" /> {f}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">Tidak ada kondisi khusus.</p>}
        </Card>
      </div>

      {/* Entry scenario */}
      {analysis.entry && <EntryScenarioCard entry={analysis.entry} />}

      {/* Multi-timeframe */}
      {analysis.multiTimeframe.length > 0 && (
        <Card>
          <CardHeader title="Multi-Timeframe Analysis" subtitle="Tren di beberapa timeframe sekaligus" />
          <div className="flex flex-wrap gap-2">
            {analysis.multiTimeframe.map((mtf) => (
              <div key={mtf.timeframe} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                <span className="text-xs font-medium text-slate-400">{mtf.timeframe}</span>
                <TrendBadge trend={mtf.trend} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function EntryScenarioCard({ entry }: { entry: NonNullable<AIAnalysis['entry']> }) {
  return (
    <Card>
      <CardHeader title="Skenario Entry & Risk Management" subtitle="Contoh level berdasarkan analisis — bukan jaminan" action={<Shield className="h-4 w-4 text-sky-400" />} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-3">
          <p className="text-xs text-slate-500">Entry Zone</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">{fmt(entry.entryMin)} – {fmt(entry.entryMax)}</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-xs text-red-400/70">Stop Loss</p>
          <p className="mt-1 text-sm font-semibold text-red-400">{fmt(entry.stopLoss)}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-xs text-emerald-400/70">Risk/Reward</p>
          <p className="mt-1 text-sm font-semibold text-emerald-400">{entry.riskReward}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-xs text-emerald-400/70">Take Profit 1</p>
          <p className="mt-1 text-sm font-semibold text-emerald-400">{fmt(entry.tp1)}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-xs text-emerald-400/70">Take Profit 2</p>
          <p className="mt-1 text-sm font-semibold text-emerald-400">{fmt(entry.tp2)}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-xs text-emerald-400/70">Take Profit 3</p>
          <p className="mt-1 text-sm font-semibold text-emerald-400">{fmt(entry.tp3)}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-amber-200/70">
        Level di atas hanyalah hasil analisis berdasarkan indikator teknikal dan bukan jaminan keuntungan.
      </p>
    </Card>
  );
}

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}
