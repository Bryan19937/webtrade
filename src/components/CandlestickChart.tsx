import { useEffect, useRef, useState, useCallback } from 'react';
import type { Candle } from '@/lib/market/types';
import type { SupportResistanceLevel } from '@/lib/indicators';

interface ChartProps {
  candles: Candle[];
  supportResistance?: SupportResistanceLevel[];
  showEMA20?: boolean;
  showEMA50?: boolean;
  showEMA200?: boolean;
  showBollinger?: boolean;
  showVolume?: boolean;
  ema20?: (number | null)[];
  ema50?: (number | null)[];
  ema200?: (number | null)[];
  bbUpper?: (number | null)[];
  bbMiddle?: (number | null)[];
  bbLower?: (number | null)[];
  height?: number;
}

interface View {
  offset: number; // index offset (can be fractional)
  barsVisible: number;
}

const MIN_BARS = 20;
const MAX_BARS = 500;

export default function CandlestickChart({
  candles,
  supportResistance = [],
  showEMA20 = false,
  showEMA50 = false,
  showEMA200 = false,
  showBollinger = false,
  showVolume = true,
  ema20 = [],
  ema50 = [],
  ema200 = [],
  bbUpper = [],
  bbMiddle = [],
  bbLower = [],
  height = 420,
}: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ offset: 0, barsVisible: 120 });
  const [hover, setHover] = useState<{ x: number; y: number; candle: Candle; index: number } | null>(null);
  const [width, setWidth] = useState(900);
  const dragRef = useRef<{ startX: number; startOffset: number } | null>(null);

  // Responsive width
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Reset view when candle count changes
  useEffect(() => {
    const bars = Math.min(120, candles.length);
    setView({ offset: Math.max(0, candles.length - bars), barsVisible: bars });
  }, [candles.length]);

  const priceAreaHeight = showVolume ? height * 0.72 : height - 30;
  const volumeAreaHeight = showVolume ? height * 0.2 : 0;
  const padding = { top: 12, right: 64, bottom: showVolume ? 24 : 12, left: 8 };

  const visibleCandles = candles.slice(
    Math.max(0, Math.floor(view.offset)),
    Math.min(candles.length, Math.ceil(view.offset + view.barsVisible)),
  );

  let priceMin = visibleCandles.length
    ? Math.min(...visibleCandles.map((c) => c.low))
    : 0;
  let priceMax = visibleCandles.length
    ? Math.max(...visibleCandles.map((c) => c.high))
    : 1;
  // Include S/R and bollinger in range
  for (const sr of supportResistance) {
    if (sr.level > priceMax * 0.95 && sr.level < priceMax * 1.1) priceMax = Math.max(priceMax, sr.level);
    if (sr.level < priceMin * 1.05 && sr.level > priceMin * 0.9) priceMin = Math.min(priceMin, sr.level);
  }
  const rangePad = (priceMax - priceMin) * 0.08 || priceMax * 0.01;
  const yMin = priceMin - rangePad;
  const yMax = priceMax + rangePad;

  const volMax = visibleCandles.length ? Math.max(...visibleCandles.map((c) => c.volume)) : 1;

  const xFor = useCallback(
    (i: number) => {
      const chartW = width - padding.left - padding.right;
      const barW = chartW / view.barsVisible;
      return padding.left + (i - view.offset) * barW + barW / 2;
    },
    [view, width],
  );
  const yFor = useCallback(
    (price: number) => {
      const chartH = priceAreaHeight - padding.top - padding.bottom;
      return padding.top + ((yMax - price) / (yMax - yMin)) * chartH;
    },
    [yMin, yMax, priceAreaHeight],
  );
  const yForVol = useCallback(
    (vol: number) => {
      const top = priceAreaHeight + 6;
      return top + (1 - vol / volMax) * (volumeAreaHeight - 12);
    },
    [volMax, volumeAreaHeight, priceAreaHeight],
  );

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Grid + price axis
    ctx.strokeStyle = '#1e293b';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px ui-sans-serif, system-ui';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const price = yMin + ((yMax - yMin) * i) / gridLines;
      const y = yFor(price);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillText(formatPrice(price), width - padding.right + 6, y + 3);
    }

    // Bollinger bands
    if (showBollinger && bbUpper.length) {
      drawLine(ctx, candles, bbUpper, xFor, yFor, '#475569', 1, view.offset, view.barsVisible);
      drawLine(ctx, candles, bbMiddle, xFor, yFor, '#64748b', 1, view.offset, view.barsVisible);
      drawLine(ctx, candles, bbLower, xFor, yFor, '#475569', 1, view.offset, view.barsVisible);
    }

    // EMA lines
    if (showEMA20 && ema20.length) drawLine(ctx, candles, ema20, xFor, yFor, '#facc15', 1.5, view.offset, view.barsVisible);
    if (showEMA50 && ema50.length) drawLine(ctx, candles, ema50, xFor, yFor, '#38bdf8', 1.5, view.offset, view.barsVisible);
    if (showEMA200 && ema200.length) drawLine(ctx, candles, ema200, xFor, yFor, '#f472b6', 1.5, view.offset, view.barsVisible);

    // Support/Resistance lines
    for (const sr of supportResistance) {
      const y = yFor(sr.level);
      const isSupport = sr.distancePct < 0;
      ctx.strokeStyle = isSupport ? '#22c55e66' : '#ef444466';
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = isSupport ? '#22c55e' : '#ef4444';
      ctx.textAlign = 'left';
      ctx.font = '10px ui-sans-serif, system-ui';
      const label = `${isSupport ? 'S' : 'R'} ${formatPrice(sr.level)}`;
      ctx.fillText(label, padding.left + 4, y - 4);
    }

    // Candles
    const chartW = width - padding.left - padding.right;
    const barW = chartW / view.barsVisible;
    const candleW = Math.max(1, barW * 0.7);
    for (let i = Math.max(0, Math.floor(view.offset)); i < Math.min(candles.length, Math.ceil(view.offset + view.barsVisible)); i++) {
      const c = candles[i];
      const x = xFor(i);
      const isUp = c.close >= c.open;
      const color = isUp ? '#22c55e' : '#ef4444';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;
      // wick
      ctx.beginPath();
      ctx.moveTo(x, yFor(c.high));
      ctx.lineTo(x, yFor(c.low));
      ctx.stroke();
      // body
      const yOpen = yFor(c.open);
      const yClose = yFor(c.close);
      const bodyTop = Math.min(yOpen, yClose);
      const bodyH = Math.max(1, Math.abs(yClose - yOpen));
      if (isUp) {
        ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
      } else {
        ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
      }
      // volume bar
      if (showVolume) {
        const vy = yForVol(c.volume);
        ctx.fillStyle = isUp ? '#22c55e33' : '#ef444433';
        ctx.fillRect(x - candleW / 2, vy, candleW, priceAreaHeight + 6 + volumeAreaHeight - 12 - vy);
      }
    }

    // Current price line
    if (visibleCandles.length) {
      const lastPrice = candles[candles.length - 1].close;
      const y = yFor(lastPrice);
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(width - padding.right, y - 9, padding.right, 18);
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'left';
      ctx.font = '11px ui-sans-serif, system-ui';
      ctx.fillText(formatPrice(lastPrice), width - padding.right + 6, y + 3);
    }

    // Crosshair + tooltip
    if (hover) {
      ctx.strokeStyle = '#475569';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hover.x, padding.top);
      ctx.lineTo(hover.x, height - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [candles, view, width, height, hover, supportResistance, showEMA20, showEMA50, showEMA200, showBollinger, showVolume, ema20, ema50, ema200, bbUpper, bbMiddle, bbLower, xFor, yFor, yForVol, priceAreaHeight, volumeAreaHeight, padding.left, padding.right, padding.top, padding.bottom, yMin, yMax, volMax]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartW = width - padding.left - padding.right;
    const barW = chartW / view.barsVisible;
    const idx = Math.floor(view.offset + (x - padding.left) / barW);
    if (idx >= 0 && idx < candles.length) {
      setHover({ x, y: e.clientY - rect.top, candle: candles[idx], index: idx });
    } else {
      setHover(null);
    }
    if (dragRef.current) {
      const dx = x - dragRef.current.startX;
      const barsMoved = dx / barW;
      let newOffset = dragRef.current.startOffset - barsMoved;
      newOffset = Math.max(0, Math.min(candles.length - view.barsVisible, newOffset));
      setView((v) => ({ ...v, offset: newOffset }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    dragRef.current = { startX: e.clientX - rect.left, startOffset: view.offset };
  };
  const handleMouseUp = () => { dragRef.current = null; };
  const handleMouseLeave = () => { setHover(null); dragRef.current = null; };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.15 : 0.87;
    let newBars = Math.min(MAX_BARS, Math.max(MIN_BARS, view.barsVisible * delta));
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartW = width - padding.left - padding.right;
    const focusIdx = view.offset + (x - padding.left) / chartW * view.barsVisible;
    let newOffset = focusIdx - (x - padding.left) / chartW * newBars;
    newOffset = Math.max(0, Math.min(candles.length - newBars, newOffset));
    setView({ offset: newOffset, barsVisible: newBars });
  };

  return (
    <div ref={containerRef} className="relative w-full select-none">
      <canvas
        ref={canvasRef}
        className="cursor-crosshair touch-none"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-xl"
          style={{
            left: Math.min(hover.x + 12, width - 180),
            top: hover.y + 12,
          }}
        >
          <div className="mb-1 font-medium text-slate-100">
            {new Date(hover.candle.time).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span className="text-slate-400">O</span><span>{formatPrice(hover.candle.open)}</span>
            <span className="text-slate-400">H</span><span className="text-emerald-400">{formatPrice(hover.candle.high)}</span>
            <span className="text-slate-400">L</span><span className="text-red-400">{formatPrice(hover.candle.low)}</span>
            <span className="text-slate-400">C</span><span>{formatPrice(hover.candle.close)}</span>
            <span className="text-slate-400">Vol</span><span>{hover.candle.volume.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  candles: Candle[],
  values: (number | null)[],
  xFor: (i: number) => number,
  yFor: (p: number) => number,
  color: string,
  width: number,
  offset: number,
  barsVisible: number,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  let started = false;
  for (let i = Math.max(0, Math.floor(offset)); i < Math.min(candles.length, Math.ceil(offset + barsVisible)); i++) {
    if (values[i] === null) continue;
    const x = xFor(i);
    const y = yFor(values[i] as number);
    if (!started) { ctx.moveTo(x, y); started = true; }
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}
