import { Activity, LayoutDashboard, LineChart, Bot, FlaskConical, Star, History, Settings, TrendingUp } from 'lucide-react';

export type PageId = 'dashboard' | 'markets' | 'analyze' | 'backtest' | 'watchlist' | 'history' | 'settings';

export const NAV_ITEMS: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'markets', label: 'Markets', icon: LineChart },
  { id: 'analyze', label: 'AI Analysis', icon: Bot },
  { id: 'backtest', label: 'Backtesting', icon: FlaskConical },
  { id: 'watchlist', label: 'Watchlist', icon: Star },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  current,
  onNavigate,
  onClose,
}: {
  current: PageId;
  onNavigate: (id: PageId) => void;
  onClose?: () => void;
}) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-800 bg-slate-950">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white">TradeAI Analyzer</h1>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">AI Market Intelligence</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); onClose?.(); }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="font-medium">{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5">
          <Activity className="h-4 w-4 text-emerald-400" />
          <span className="text-xs text-slate-400">Market Data: Live (Sim)</span>
        </div>
      </div>
    </aside>
  );
}
