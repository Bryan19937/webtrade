import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, Skeleton, EmptyState, Badge, Disclaimer } from '@/components/ui';
import { History as HistoryIcon, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface HistoryItem {
  id: string;
  symbol: string;
  timeframe: string;
  signal: string;
  trend: string;
  sentiment: string;
  confidence: number;
  price_at_analysis: number;
  summary: string;
  created_at: string;
}

export function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('analysis_history').select('*').order('created_at', { ascending: false }).limit(100);
    setItems((data ?? []) as HistoryItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const clearAll = async () => {
    await supabase.from('analysis_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setItems([]);
  };

  const signalColor = (s: string) => s === 'BUY' ? 'green' : s === 'SELL' ? 'red' : 'amber';
  const trendColor = (t: string) => t === 'Bullish' ? 'green' : t === 'Bearish' ? 'red' : 'slate';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><HistoryIcon className="h-5 w-5 text-emerald-400" /> Riwayat Analisis</h2>
          <p className="text-sm text-slate-500">Histori analisis AI yang telah Anda simpan</p>
        </div>
        {items.length > 0 && (
          <button onClick={clearAll} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-red-500/10 hover:text-red-400">
            <Trash2 className="h-4 w-4" /> Hapus Semua
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : items.length === 0 ? (
        <Card><EmptyState title="Belum ada riwayat" message="Jalankan analisis AI di halaman AI Analysis dan simpan hasilnya untuk melihatnya di sini." icon={<HistoryIcon className="h-10 w-10" />} /></Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-200">{item.symbol}</p>
                  <Badge color="slate">{item.timeframe}</Badge>
                  <Badge color={signalColor(item.signal)}>{item.signal}</Badge>
                  <Badge color={trendColor(item.trend)}>{item.trend}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>Confidence: <span className="font-semibold text-slate-300">{item.confidence}%</span></span>
                  <span className="tabular-nums">{item.price_at_analysis >= 1000 ? item.price_at_analysis.toLocaleString('en-US', { maximumFractionDigits: 2 }) : item.price_at_analysis.toFixed(4)}</span>
                  <span>{new Date(item.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.summary}</p>
            </Card>
          ))}
        </div>
      )}
      <Disclaimer />
    </div>
  );
}
