export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/50 p-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-800 ${className}`} />;
}

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
      {label && <p className="text-sm text-slate-400">{label}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
        <span className="text-xl text-red-400">!</span>
      </div>
      <p className="max-w-sm text-sm text-slate-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-1 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message, icon }: { title: string; message: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {icon && <div className="text-slate-600">{icon}</div>}
      <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
      <p className="max-w-sm text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function Badge({ children, color = 'slate' }: { children: React.ReactNode; color?: 'green' | 'red' | 'slate' | 'amber' | 'blue' }) {
  const colors = {
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    slate: 'bg-slate-700/30 text-slate-300 border-slate-600/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

export function Disclaimer() {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
      <p className="text-xs leading-relaxed text-amber-200/80">
        <span className="font-semibold">Disclaimer:</span> Analisis AI hanya untuk tujuan informasi dan edukasi.
        Sinyal, prediksi, entry, stop loss, dan take profit bukan jaminan keuntungan.
        Keputusan trading dan risiko sepenuhnya berada pada pengguna.
      </p>
    </div>
  );
}
