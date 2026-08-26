import { useState, useEffect } from 'react';
import { Sidebar, type PageId } from '@/components/Sidebar';
import { DashboardPage } from '@/pages/DashboardPage';
import { MarketsPage } from '@/pages/MarketsPage';
import { AnalyzePage } from '@/pages/AnalyzePage';
import { BacktestPage } from '@/pages/BacktestPage';
import { WatchlistPage } from '@/pages/WatchlistPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { Menu, X } from 'lucide-react';

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace('#/', '');
    if (hash && ['dashboard', 'markets', 'analyze', 'backtest', 'watchlist', 'history', 'settings'].includes(hash)) {
      setPage(hash as PageId);
    }
  }, []);

  const navigate = (id: PageId) => {
    setPage(id);
    window.location.hash = `/${id}`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar current={page} onNavigate={navigate} />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full animate-fade-in">
            <Sidebar current={page} onNavigate={navigate} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-slate-200">
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-sm font-bold text-white">TradeAI Analyzer</span>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div key={page} className="animate-fade-in mx-auto max-w-7xl">
            {page === 'dashboard' && <DashboardPage />}
            {page === 'markets' && <MarketsPage />}
            {page === 'analyze' && <AnalyzePage />}
            {page === 'backtest' && <BacktestPage />}
            {page === 'watchlist' && <WatchlistPage />}
            {page === 'history' && <HistoryPage />}
            {page === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>
    </div>
  );
}
