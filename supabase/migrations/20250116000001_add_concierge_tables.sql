-- Create concierge_events table
CREATE TABLE IF NOT EXISTS concierge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  intent text NOT NULL,
  confidence numeric(3,2) NOT NULL,
  route text NOT NULL,
  result text NOT NULL CHECK (result IN ('opened','failed','cancelled')),
  meta jsonb NOT NULL DEFAULT '{}'
);

-- Create concierge_prefs table
CREATE TABLE IF NOT EXISTS concierge_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  nudge_opt_in boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE concierge_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE concierge_prefs ENABLE ROW LEVEL SECURITY;

-- Policies for concierge_events
CREATE POLICY "Users can view their own concierge events" ON concierge_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own concierge events" ON concierge_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for concierge_prefs
CREATE POLICY "Users can view their own concierge preferences" ON concierge_prefs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own concierge preferences" ON concierge_prefs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own concierge preferences" ON concierge_prefs
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_concierge_events_user_id ON concierge_events(user_id);
CREATE INDEX IF NOT EXISTS idx_concierge_events_occurred_at ON concierge_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_concierge_events_intent ON concierge_events(intent);
