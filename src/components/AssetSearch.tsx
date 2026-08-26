import { useMemo } from 'react';
import { marketProvider } from '@/lib/market/provider';
import { Card } from '@/components/ui';
import type { AssetInfo } from '@/lib/market/types';

export function AssetSearch({
  onSelect,
  selected,
  placeholder = 'Cari aset... (BTC, ETH, EUR/USD, AAPL)',
}: {
  onSelect: (asset: AssetInfo) => void;
  selected?: string;
  placeholder?: string;
}) {
  const results = useMemo(() => marketProvider.searchAssets(''), []);
  return (
    <div className="relative">
      <input
        list="asset-list"
        defaultValue={selected}
        placeholder={placeholder}
        onChange={(e) => {
          const match = results.find((r) => r.symbol === e.target.value.toUpperCase());
          if (match) onSelect(match);
        }}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      <datalist id="asset-list">
        {results.map((r) => (
          <option key={r.symbol} value={r.symbol}>
            {r.name}
          </option>
        ))}
      </datalist>
    </div>
  );
}

export function TimeframeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (tf: string) => void;
}) {
  const tfs = ['1m', '5m', '15m', '1H', '4H', '1D', '1W'];
  return (
    <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
      {tfs.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === tf
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}

export function PriceDisplay({ price, changePct }: { price: number; changePct: number }) {
  const positive = changePct >= 0;
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-2xl font-bold text-white tabular-nums">
        {price >= 1000 ? price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : price.toFixed(4)}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {positive ? '+' : ''}{changePct.toFixed(2)}%
      </span>
    </div>
  );
}
