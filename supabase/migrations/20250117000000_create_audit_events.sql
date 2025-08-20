-- 1) Enum for event types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_event_type') THEN
    CREATE TYPE audit_event_type AS ENUM (
      'login','logout','password_change','patient_add','patient_delete','profile_update','subscription_update'
    );
  END IF;
END $$;

-- 2) Audit table
CREATE TABLE IF NOT EXISTS audit_events (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type      audit_event_type NOT NULL,
  event_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip              INET NULL,                -- optional; consider truncating before insert
  user_agent      TEXT NULL,
  region          TEXT NULL,                -- 'AU' | 'UK' | 'US' or similar
  success         BOOLEAN NOT NULL DEFAULT TRUE,
  context         JSONB NOT NULL DEFAULT '{}'::jsonb  -- arbitrary details (e.g., patient_id, name)
);

-- 3) Indexes for quick reads
CREATE INDEX IF NOT EXISTS audit_events_user_event_time_idx
  ON audit_events (user_id, event_type, event_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_user_time_idx
  ON audit_events (user_id, event_at DESC);

-- 4) RLS: select own, insert own; block update/delete
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_events' AND policyname = 'audit_select_own'
  ) THEN
    CREATE POLICY audit_select_own ON audit_events
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_events' AND policyname = 'audit_insert_own'
  ) THEN
    CREATE POLICY audit_insert_own ON audit_events
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- (No UPDATE/DELETE policies → blocked by default for authenticated users)

-- 5) Triggers to log patient add/delete automatically
CREATE OR REPLACE FUNCTION log_patient_audit() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_events (user_id, event_type, context)
    VALUES (auth.uid(), 'patient_add', jsonb_build_object('patient_id', NEW.id, 'full_name', NEW.full_name));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_events (user_id, event_type, context)
    VALUES (auth.uid(), 'patient_delete', jsonb_build_object('patient_id', OLD.id, 'full_name', OLD.full_name));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach only for the events you need
DROP TRIGGER IF EXISTS trg_patient_audit_ins ON patients;
CREATE TRIGGER trg_patient_audit_ins
AFTER INSERT ON patients
FOR EACH ROW EXECUTE FUNCTION log_patient_audit();

DROP TRIGGER IF EXISTS trg_patient_audit_del ON patients;
CREATE TRIGGER trg_patient_audit_del
AFTER DELETE ON patients
FOR EACH ROW EXECUTE FUNCTION log_patient_audit();
