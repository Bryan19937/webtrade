/*
# TradeAI Analyzer — core tables (single-tenant, no auth)

1. New Tables
- `watchlist`: saved assets the user tracks, with last-computed trend/sentiment.
  - id (uuid pk), symbol (text), name (text), market (text), timeframe (text),
    trend (text), sentiment (text), signal (text), last_price (numeric), change_pct (numeric),
    created_at, updated_at.
- `analysis_history`: every AI analysis the user runs, saved for the History page.
  - id (uuid pk), symbol (text), timeframe (text), signal (text), trend (text),
    sentiment (text), confidence (int), price_at_analysis (numeric),
    summary (text), factors (jsonb), entry (jsonb), created_at.
- `alerts`: user-defined price/indicator alerts.
  - id (uuid pk), symbol (text), type (text), condition (text), target_value (numeric),
    active (bool), triggered (bool), triggered_at (timestamptz), created_at.
- `backtest_results`: saved backtest runs.
  - id (uuid pk), symbol (text), timeframe (text), strategy (text), period (text),
    initial_capital (numeric), final_capital (numeric), total_trades (int),
    win_rate (numeric), loss_rate (numeric), max_drawdown (numeric),
    risk_reward (numeric), equity_curve (jsonb), created_at.

2. Security
- Enable RLS on all tables.
- Single-tenant no-auth app: allow anon + authenticated full CRUD on all tables
  (data is intentionally shared/local to this project instance).

3. Notes
- All numeric price fields use numeric(20,8) for precision.
- jsonb columns store structured indicator/entry/equity data.
*/

CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  name text NOT NULL,
  market text NOT NULL DEFAULT 'crypto',
  timeframe text NOT NULL DEFAULT '1H',
  trend text,
  sentiment text,
  signal text,
  last_price numeric(20,8),
  change_pct numeric(10,4),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (symbol)
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_watchlist" ON watchlist;
CREATE POLICY "anon_select_watchlist" ON watchlist FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_watchlist" ON watchlist;
CREATE POLICY "anon_insert_watchlist" ON watchlist FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_watchlist" ON watchlist;
CREATE POLICY "anon_update_watchlist" ON watchlist FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_watchlist" ON watchlist;
CREATE POLICY "anon_delete_watchlist" ON watchlist FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS analysis_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  timeframe text NOT NULL,
  signal text NOT NULL,
  trend text NOT NULL,
  sentiment text NOT NULL,
  confidence int NOT NULL,
  price_at_analysis numeric(20,8) NOT NULL,
  summary text NOT NULL,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  entry jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_analysis_history" ON analysis_history;
CREATE POLICY "anon_select_analysis_history" ON analysis_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_analysis_history" ON analysis_history;
CREATE POLICY "anon_insert_analysis_history" ON analysis_history FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_analysis_history" ON analysis_history;
CREATE POLICY "anon_update_analysis_history" ON analysis_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_analysis_history" ON analysis_history;
CREATE POLICY "anon_delete_analysis_history" ON analysis_history FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  type text NOT NULL,
  condition text NOT NULL,
  target_value numeric(20,8),
  active boolean NOT NULL DEFAULT true,
  triggered boolean NOT NULL DEFAULT false,
  triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS backtest_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  timeframe text NOT NULL,
  strategy text NOT NULL,
  period text NOT NULL,
  initial_capital numeric(20,8) NOT NULL,
  final_capital numeric(20,8) NOT NULL,
  total_trades int NOT NULL,
  win_rate numeric(10,4) NOT NULL,
  loss_rate numeric(10,4) NOT NULL,
  max_drawdown numeric(10,4) NOT NULL,
  risk_reward numeric(10,4) NOT NULL,
  equity_curve jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE backtest_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_backtest_results" ON backtest_results;
CREATE POLICY "anon_select_backtest_results" ON backtest_results FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_backtest_results" ON backtest_results;
CREATE POLICY "anon_insert_backtest_results" ON backtest_results FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_backtest_results" ON backtest_results;
CREATE POLICY "anon_update_backtest_results" ON backtest_results FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_backtest_results" ON backtest_results;
CREATE POLICY "anon_delete_backtest_results" ON backtest_results FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist(symbol);
CREATE INDEX IF NOT EXISTS idx_analysis_history_created ON analysis_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_backtest_results_created ON backtest_results(created_at DESC);