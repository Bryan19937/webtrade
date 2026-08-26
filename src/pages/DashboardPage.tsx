import { useState, useMemo } from 'react';
import { marketProvider } from '@/lib/market/provider';
import { useMarketData } from '@/hooks/useMarketData';
import { analyze } from '@/lib/ai/analyzer';
import CandlestickChart from '@/components/CandlestickChart';
import { AssetSearch, TimeframeSelector, PriceDisplay } from '@/components/AssetSearch';
import { Card, CardHeader, Skeleton, LoadingSpinner, ErrorState, Badge, Disclaimer } from '@/components/ui';
import { SignalBadge, TrendBadge, SentimentBadge, ConfidenceBar } from '@/components/AIAnalysisPanel';
import { IndicatorPanel } from '@/components/IndicatorPanel';
import { Star, Bell } from 'lucide-react';
import type { AssetInfo, Timeframe } from '@/lib/market/types';
import { supabase } from '@/lib/supabase';

export function DashboardPage({ initialSymbol = 'BTC/USDT' }: { initialSymbol?: string }) {
  const [asset, setAsset] = useState<AssetInfo>(() => marketProvider.getAsset(initialSymbol) ?? marketProvider.listAssets()[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const [showEMA20, setShowEMA20] = useState(true);
  const [showEMA50, setShowEMA50] = useState(true);
  const [showEMA200, setShowEMA200] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [watching, setWatching] = useState(false);

  const { data, loading, error, reload } = useMarketData(asset.symbol, timeframe);
  const analysis = useMemo(() => {
    if (!data || data.candles.length < 30) return null;
    return analyze(data.candles, asset.symbol, timeframe);
  }, [data, asset.symbol, timeframe]);

  const sr = analysis?.supportResistance ?? [];

  const toggleWatchlist = async () => {
    if (watching) {
      await supabase.from('watchlist').delete().eq('symbol', asset.symbol);
      setWatching(false);
    } else {
      await supabase.from('watchlist').upsert({
        symbol: asset.symbol,
        name: asset.name,
        market: asset.market,
        timeframe,
        trend: analysis?.trend,
        sentiment: analysis?.sentiment,
        signal: analysis?.signal,
        last_price: analysis?.currentPrice,
        change_pct: analysis?.changePct,
      });
      setWatching(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <AssetSearch onSelect={setAsset} selected={asset.symbol} />
          <TimeframeSelector value={timeframe} onChange={(tf) => setTimeframe(tf as Timeframe)} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleWatchlist}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
              watching ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star className={`h-4 w-4 ${watching ? 'fill-amber-400' : ''}`} /> Watch
          </button>
        </div>
      </div>

      {/* Price + quick stats */}
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <p className="text-xs text-slate-500">{asset.name}</p>
          {loading || !analysis ? (
            <Skeleton className="mt-2 h-8 w-32" />
          ) : (
            <PriceDisplay price={analysis.currentPrice} changePct={analysis.changePct} />
          )}
        </Card>
        <Card>
          <p className="text-xs text-slate-500">AI Signal</p>
          <div className="mt-2">{analysis ? <SignalBadge signal={analysis.signal} /> : <Skeleton className="h-6 w-16" />}</div>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Trend</p>
          <div className="mt-2">{analysis ? <TrendBadge trend={analysis.trend} /> : <Skeleton className="h-6 w-20" />}</div>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Sentiment</p>
          <div className="mt-2">{analysis ? <SentimentBadge sentiment={analysis.sentiment} /> : <Skeleton className="h-6 w-24" />}</div>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader
          title="Price Chart"
          subtitle={`${asset.symbol} · ${timeframe}`}
          action={
            <div className="flex flex-wrap gap-1.5">
              <ToggleChip label="EMA 20" active={showEMA20} onClick={() => setShowEMA20(!showEMA20)} color="#facc15" />
              <ToggleChip label="EMA 50" active={showEMA50} onClick={() => setShowEMA50(!showEMA50)} color="#38bdf8" />
              <ToggleChip label="EMA 200" active={showEMA200} onClick={() => setShowEMA200(!showEMA200)} color="#f472b6" />
              <ToggleChip label="BB" active={showBollinger} onClick={() => setShowBollinger(!showBollinger)} color="#64748b" />
              <ToggleChip label="Vol" active={showVolume} onClick={() => setShowVolume(!showVolume)} color="#475569" />
            </div>
          }
        />
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading || !data ? (
          <Skeleton className="h-[420px] w-full" />
        ) : (
          <CandlestickChart
            candles={data.candles}
            supportResistance={sr}
            showEMA20={showEMA20}
            showEMA50={showEMA50}
            showEMA200={showEMA200}
            showBollinger={showBollinger}
            showVolume={showVolume}
            ema20={data.ema20}
            ema50={data.ema50}
            ema200={data.ema200}
            bbUpper={data.bbUpper}
            bbMiddle={data.bbMiddle}
            bbLower={data.bbLower}
          />
        )}
      </Card>

      {/* Confidence + Indicators */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="AI Confidence" />
          {analysis ? <ConfidenceBar confidence={analysis.confidence} /> : <Skeleton className="h-4 w-full" />}
          <p className="mt-2 text-xs text-slate-500">
            Confidence mengukur konvergensi indikator, bukan probabilitas pasti pergerakan harga.
          </p>
        </Card>
        {analysis ? <IndicatorPanel ind={analysis.indicators} /> : <Card><Skeleton className="h-40 w-full" /></Card>}
      </div>

      <Disclaimer />
    </div>
  );
}

function ToggleChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
        active ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-slate-800 text-slate-500 hover:text-slate-300'
      }`}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? color : '#334155' }} />
      {label}
    </button>
  );
}
