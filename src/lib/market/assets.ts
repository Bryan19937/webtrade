import type { AssetInfo } from './types';

// A curated catalog of tradeable assets. basePrice/volatility/drift seed the
// deterministic synthetic generator so each symbol has a believable personality.
export const ASSETS: AssetInfo[] = [
  { symbol: 'BTC/USDT', name: 'Bitcoin / Tether', market: 'crypto', basePrice: 67500, volatility: 0.018, drift: 0.04 },
  { symbol: 'ETH/USDT', name: 'Ethereum / Tether', market: 'crypto', basePrice: 3450, volatility: 0.022, drift: 0.03 },
  { symbol: 'SOL/USDT', name: 'Solana / Tether', market: 'crypto', basePrice: 168, volatility: 0.032, drift: 0.02 },
  { symbol: 'BNB/USDT', name: 'BNB / Tether', market: 'crypto', basePrice: 590, volatility: 0.02, drift: 0.01 },
  { symbol: 'XRP/USDT', name: 'Ripple / Tether', market: 'crypto', basePrice: 0.52, volatility: 0.028, drift: -0.01 },
  { symbol: 'ADA/USDT', name: 'Cardano / Tether', market: 'crypto', basePrice: 0.38, volatility: 0.03, drift: -0.02 },
  { symbol: 'DOGE/USDT', name: 'Dogecoin / Tether', market: 'crypto', basePrice: 0.11, volatility: 0.04, drift: 0.01 },
  { symbol: 'AVAX/USDT', name: 'Avalanche / Tether', market: 'crypto', basePrice: 27.5, volatility: 0.035, drift: 0.0 },
  { symbol: 'LINK/USDT', name: 'Chainlink / Tether', market: 'crypto', basePrice: 11.8, volatility: 0.03, drift: 0.02 },
  { symbol: 'MATIC/USDT', name: 'Polygon / Tether', market: 'crypto', basePrice: 0.58, volatility: 0.03, drift: -0.01 },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', market: 'forex', basePrice: 1.085, volatility: 0.004, drift: 0.01 },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', market: 'forex', basePrice: 1.27, volatility: 0.005, drift: 0.0 },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', market: 'forex', basePrice: 156.5, volatility: 0.005, drift: 0.02 },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', market: 'forex', basePrice: 0.665, volatility: 0.006, drift: -0.01 },
  { symbol: 'XAU/USD', name: 'Gold / US Dollar', market: 'metals', basePrice: 2480, volatility: 0.008, drift: 0.03 },
  { symbol: 'XAG/USD', name: 'Silver / US Dollar', market: 'metals', basePrice: 29.4, volatility: 0.012, drift: 0.02 },
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'stocks', basePrice: 229, volatility: 0.012, drift: 0.02 },
  { symbol: 'TSLA', name: 'Tesla Inc.', market: 'stocks', basePrice: 248, volatility: 0.025, drift: 0.01 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', market: 'stocks', basePrice: 128, volatility: 0.022, drift: 0.05 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', market: 'stocks', basePrice: 418, volatility: 0.011, drift: 0.02 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'stocks', basePrice: 168, volatility: 0.013, drift: 0.02 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'stocks', basePrice: 186, volatility: 0.014, drift: 0.02 },
];

export const ASSET_MAP: Record<string, AssetInfo> = Object.fromEntries(
  ASSETS.map((a) => [a.symbol, a]),
);
