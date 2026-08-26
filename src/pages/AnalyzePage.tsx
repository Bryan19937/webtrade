import { useState, useMemo } from 'react';
import { marketProvider } from '@/lib/market/provider';
import { useMarketData, useMultiTimeframeData } from '@/hooks/useMarketData';
import { analyze } from '@/lib/ai/analyzer';
import CandlestickChart from '@/components/CandlestickChart';
import { AssetSearch, TimeframeSelector } from '@/components/AssetSearch';
import { Card, CardHeader, Skeleton, LoadingSpinner, ErrorState, Disclaimer } from '@/components/ui';
import { AIAnalysisPanel } from '@/components/AIAnalysisPanel';
import { IndicatorPanel } from '@/components/IndicatorPanel';
import { Bot } from 'lucide-react';
import type { AssetInfo, Timeframe } from '@/lib/market/types';
import { supabase } from '@/lib/supabase';

const MTF_LIST: Timeframe[] = ['15m', '1H', '4H', '1D'];

export function AnalyzePage({ initialSymbol = 'BTC/USDT' }: { initialSymbol?: string }) {
  const [asset, setAsset] = useState<AssetInfo>(() => marketProvider.getAsset(initialSymbol) ?? marketProvider.listAssets()[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const [analyzing, setAnalyzing] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data, loading, error, reload } = useMarketData(asset.symbol, timeframe);
  const { multi, loading: mtfLoading } = useMultiTimeframeData(asset.symbol, MTF_LIST);

  const analysis = useMemo(() => {
    if (!data || data.candles.length < 30) return null;
    const multiCandles: Record<Timeframe, typeof data.candles> = {};
    for (const tf of MTF_LIST) {
      if (multi[tf] && multi[tf].length >= 30) multiCandles[tf] = multi[tf];
    }
    return analyze(data.candles, asset.symbol, timeframe, multiCandles);
  }, [data, asset.symbol, timeframe, multi]);

  const saveAnalysis = async () => {
    if (!analysis) return;
    setAnalyzing(true);
    // Simulate AI thinking time
    await new Promise((r) => setTimeout(r, 800));
    try {
      await supabase.from('analysis_history').insert({
        symbol: analysis.symbol,
        timeframe: analysis.timeframe,
        signal: analysis.signal,
        trend: analysis.trend,
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
        price_at_analysis: analysis.currentPrice,
        summary: analysis.summary,
        factors: analysis.factors,
        entry: analysis.entry,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore — data still shows
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Bot className="h-5 w-5 text-emerald-400" /> AI Market Analysis
          </h2>
          <p className="text-sm text-slate-500">Analisis menyeluruh berbasis data pasar dan indikator teknikal</p>
        </div>
        <div className="flex items-center gap-3">
          <AssetSearch onSelect={setAsset} selected={asset.symbol} />
          <TimeframeSelector value={timeframe} onChange={(tf) => setTimeframe(tf as Timeframe)} />
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading || !data ? (
        <Card><Skeleton className="h-[420px] w-full" /></Card>
      ) : (
        <Card>
          <CardHeader title="Chart" subtitle={`${asset.symbol} · ${timeframe}`} />
          <CandlestickChart
            candles={data.candles}
            supportResistance={analysis?.supportResistance ?? []}
            showEMA20
            showEMA50
            showVolume
            ema20={data.ema20}
            ema50={data.ema50}
            ema200={data.ema200}
          />
        </Card>
      )}

      {analyzing ? (
        <Card>
          <LoadingSpinner label="AI sedang menganalisis data pasar dan indikator..." />
        </Card>
      ) : analysis ? (
        <>
          <div className="flex justify-end">
            <button
              onClick={saveAnalysis}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                saved ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {saved ? 'Tersimpan ke History' : 'Simpan Analisis'}
            </button>
          </div>
          <AIAnalysisPanel analysis={analysis} />
          <IndicatorPanel ind={analysis.indicators} />
        </>
      ) : (
        !loading && !error && (
          <Card>
            <ErrorState message="Data pasar tidak tersedia. Analisis tidak dapat dilakukan." onRetry={reload} />
          </Card>
        )
      )}

      <Disclaimer />
    </div>
  );
}
