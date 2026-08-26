import { useEffect, useState, useCallback } from 'react';
import { marketProvider } from '@/lib/market/provider';
import { Card, CardHeader, Skeleton, EmptyState, Badge, Disclaimer } from '@/components/ui';
import { Star, Trash2, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AssetInfo } from '@/lib/market/types';

interface WatchItem {
  id: string;
  symbol: string;
  name: string;
  market: string;
  timeframe: string;
  trend: string | null;
  sentiment: string | null;
  signal: string | null;
  last_price: number | null;
  change_pct: number | null;
}

export function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [allAssets] = useState(() => marketProvider.listAssets());

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('watchlist').select('*').order('created_at', { ascending: false });
    setItems((data ?? []) as WatchItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    for (const item of items) {
      const q = await marketProvider.getQuote(item.symbol);
      if (q) {
        await supabase.from('watchlist').update({ last_price: q.price, change_pct: q.changePct, updated_at: new Date().toISOString() }).eq('id', item.id);
      }
    }
    await load();
    setRefreshing(false);
  };

  const remove = async (id: string) => {
    await supabase.from('watchlist').delete().eq('id', id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const add = async (asset: AssetInfo) => {
    const q = await marketProvider.getQuote(asset.symbol);
    await supabase.from('watchlist').upsert({
      symbol: asset.symbol,
      name: asset.name,
      market: asset.market,
      timeframe: '1H',
      last_price: q?.price ?? null,
      change_pct: q?.changePct ?? null,
    });
    setShowAdd(false);
    load();
  };

  const trendColor = (t: string | null) => t === 'Bullish' ? 'green' : t === 'Bearish' ? 'red' : 'slate';
  const signalColor = (s: string | null) => s === 'BUY' ? 'green' : s === 'SELL' ? 'red' : 'amber';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><Star className="h-5 w-5 text-amber-400" /> Watchlist</h2>
          <p className="text-sm text-slate-500">Aset yang Anda pantau</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} disabled={refreshing || items.length === 0} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
            <Plus className="h-4 w-4" /> Tambah
          </button>
        </div>
      </div>

      {showAdd && (
        <Card>
          <CardHeader title="Pilih Aset" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-60 overflow-auto">
            {allAssets.filter((a) => !items.some((i) => i.symbol === a.symbol)).map((a) => (
              <button key={a.symbol} onClick={() => add(a)} className="rounded-lg border border-slate-800 p-3 text-left hover:border-emerald-500/30 hover:bg-slate-800/50">
                <p className="text-sm font-semibold text-slate-200">{a.symbol}</p>
                <p className="text-xs text-slate-500">{a.name}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : items.length === 0 ? (
        <Card><EmptyState title="Watchlist kosong" message="Tambahkan aset ke watchlist untuk memantau pergerakan harganya." icon={<Star className="h-10 w-10" />} /></Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{item.symbol}</p>
                  <p className="text-xs text-slate-500">{item.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.last_price !== null && (
                  <span className="text-sm font-medium tabular-nums text-slate-200">
                    {item.last_price >= 1000 ? item.last_price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : item.last_price.toFixed(4)}
                  </span>
                )}
                {item.change_pct !== null && (
                  <span className={`text-xs tabular-nums ${item.change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {item.change_pct >= 0 ? '+' : ''}{item.change_pct.toFixed(2)}%
                  </span>
                )}
                {item.trend && <Badge color={trendColor(item.trend)}>{item.trend}</Badge>}
                {item.signal && <Badge color={signalColor(item.signal)}>{item.signal}</Badge>}
                <button onClick={() => remove(item.id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Disclaimer />
    </div>
  );
}
