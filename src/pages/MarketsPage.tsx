import { useEffect, useState } from 'react';
import { marketProvider } from '@/lib/market/provider';
import { Card, CardHeader, Skeleton, ErrorState, Badge } from '@/components/ui';
import type { AssetInfo } from '@/lib/market/types';
import { LineChart as LineIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function MarketsPage() {
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [quotes, setQuotes] = useState<Record<string, { price: number; changePct: number } | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = marketProvider.listAssets();
        setAssets(list);
        const q: Record<string, { price: number; changePct: number } | null> = {};
        for (const a of list) {
          q[a.symbol] = await marketProvider.getQuote(a.symbol);
        }
        setQuotes(q);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal memuat data pasar.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = filter === 'all' ? assets : assets.filter((a) => a.market === filter);
  const filters = ['all', 'crypto', 'forex', 'stocks', 'metals'];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Markets</h2>
        <p className="text-sm text-slate-500">Pantau harga seluruh aset yang tersedia</p>
      </div>
      <div className="flex gap-1.5">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === f ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const q = quotes[a.symbol];
            const positive = q ? q.changePct >= 0 : true;
            return (
              <Card key={a.symbol} className="transition-colors hover:border-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{a.symbol}</p>
                    <p className="text-xs text-slate-500">{a.name}</p>
                  </div>
                  <Badge color="slate">{a.market}</Badge>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  {q ? (
                    <span className="text-lg font-bold text-white tabular-nums">
                      {q.price >= 1000 ? q.price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : q.price.toFixed(4)}
                    </span>
                  ) : (
                    <Skeleton className="h-6 w-20" />
                  )}
                  {q && (
                    <span className={`flex items-center gap-1 text-sm font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {positive ? '+' : ''}{q.changePct.toFixed(2)}%
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
