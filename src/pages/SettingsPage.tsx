import { useEffect, useState } from 'react';
import { Card, CardHeader, Badge, Disclaimer, EmptyState } from '@/components/ui';
import { Bell, BellRing, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { marketProvider } from '@/lib/market/provider';

interface AlertItem {
  id: string;
  symbol: string;
  type: string;
  condition: string;
  target_value: number | null;
  active: boolean;
  triggered: boolean;
  created_at: string;
}

const ALERT_TYPES = [
  { id: 'price_support', label: 'Harga mencapai support' },
  { id: 'price_resistance', label: 'Harga mencapai resistance' },
  { id: 'rsi_oversold', label: 'RSI masuk oversold (<30)' },
  { id: 'rsi_overbought', label: 'RSI masuk overbought (>70)' },
  { id: 'macd_cross', label: 'MACD crossover' },
  { id: 'breakout', label: 'Breakout' },
  { id: 'breakdown', label: 'Breakdown' },
];

export function SettingsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [type, setType] = useState('price_support');
  const [target, setTarget] = useState('');

  const load = async () => {
    const { data } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
    setAlerts((data ?? []) as AlertItem[]);
  };

  useEffect(() => { load(); }, []);

  const addAlert = async () => {
    const asset = marketProvider.getAsset(symbol);
    if (!asset) return;
    const cond = ALERT_TYPES.find((t) => t.id === type)?.label ?? type;
    await supabase.from('alerts').insert({
      symbol,
      type,
      condition: cond,
      target_value: target ? Number(target) : null,
      active: true,
      triggered: false,
    });
    setTarget('');
    load();
  };

  const toggleAlert = async (id: string, active: boolean) => {
    await supabase.from('alerts').update({ active: !active }).eq('id', id);
    load();
  };

  const removeAlert = async (id: string) => {
    await supabase.from('alerts').delete().eq('id', id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><Bell className="h-5 w-5 text-emerald-400" /> Settings & Alerts</h2>
        <p className="text-sm text-slate-500">Kelola notifikasi dan preferensi aplikasi</p>
      </div>

      {/* Alert creation */}
      <Card>
        <CardHeader title="Buat Alert Baru" subtitle="Notifikasi otomatis saat kondisi terpenuhi" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs text-slate-500">Aset</label>
            <input list="alert-asset-list" value={symbol} onChange={(e) => setSymbol(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none" />
            <datalist id="alert-asset-list">
              {marketProvider.listAssets().map((a) => <option key={a.symbol} value={a.symbol} />)}
            </datalist>
          </div>
          <div>
            <label className="text-xs text-slate-500">Kondisi</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none">
              {ALERT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Target Harga (opsional)</label>
            <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="contoh: 68000" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none" />
          </div>
          <div className="flex items-end">
            <button onClick={addAlert} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
              <Plus className="h-4 w-4" /> Buat Alert
            </button>
          </div>
        </div>
      </Card>

      {/* Alert list */}
      <Card>
        <CardHeader title="Alert Aktif" />
        {alerts.length === 0 ? (
          <EmptyState title="Belum ada alert" message="Buat alert untuk dipnotifikasi saat kondisi pasar tertentu tercapai." icon={<Bell className="h-10 w-10" />} />
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  {a.active && !a.triggered ? <BellRing className="h-4 w-4 text-emerald-400" /> : <Bell className="h-4 w-4 text-slate-500" />}
                  <div>
                    <p className="text-sm font-medium text-slate-200">{a.symbol}</p>
                    <p className="text-xs text-slate-500">{a.condition}{a.target_value ? ` @ ${a.target_value}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={a.triggered ? 'amber' : a.active ? 'green' : 'slate'}>
                    {a.triggered ? 'Triggered' : a.active ? 'Active' : 'Off'}
                  </Badge>
                  <button onClick={() => toggleAlert(a.id, a.active)} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                    {a.active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button onClick={() => removeAlert(a.id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* About */}
      <Card>
        <CardHeader title="Tentang Aplikasi" />
        <div className="space-y-2 text-sm text-slate-400">
          <p>TradeAI Analyzer adalah alat bantu analisis pasar trading berbasis AI. Aplikasi ini menganalisis trend, indikator teknikal, price action, dan market structure untuk memberikan insight — bukan jaminan keuntungan.</p>
          <p className="text-xs text-slate-500">Data pasar: Simulated (deterministic) · Provider: pluggable · AI Engine: rule-based indicator convergence</p>
        </div>
      </Card>

      <Disclaimer />
    </div>
  );
}
