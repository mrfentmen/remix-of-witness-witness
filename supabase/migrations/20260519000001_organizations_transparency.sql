-- Organizations table (for WitnessOrgBusiness.tsx)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  org_name TEXT NOT NULL,
  org_type TEXT DEFAULT 'nonprofit',
  fiscal_sponsor TEXT,
  ein TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own org"
  ON public.organizations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own org"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own org"
  ON public.organizations FOR UPDATE
  USING (auth.uid() = user_id);

-- Government request counter (admins only)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS govt_requests_count INTEGER NOT NULL DEFAULT 0;

-- Transparency report JSON (stored as static record, admin-editable)
CREATE TABLE IF NOT EXISTS public.transparency_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter TEXT NOT NULL UNIQUE, -- e.g. "2025-Q1"
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transparency_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read transparency reports"
  ON public.transparency_reports FOR SELECT
  USING (true);

-- Service uptime status table
CREATE TABLE IF NOT EXISTS public.service_status (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'operational', -- operational | degraded | outage
  uptime_90day REAL NOT NULL DEFAULT 99.99,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.service_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read service status"
  ON public.service_status FOR SELECT
  USING (true);

-- Seed default service statuses
INSERT INTO public.service_status (id, name, status, uptime_90day) VALUES
  ('rec', 'Recording and encryption', 'operational', 99.99),
  ('s3', 'Cloud backup (S3)', 'operational', 99.95),
  ('supabase', 'Authentication (Supabase)', 'operational', 99.98),
  ('mux', 'Livestreaming (Mux)', 'operational', 99.97),
  ('map', 'Map service (Leaflet)', 'operational', 99.99),
  ('push', 'Push notifications', 'operational', 99.90),
  ('twilio', 'SMS alerts (Twilio)', 'operational', 99.99),
  ('verify', 'Public verify page', 'operational', 99.99),
  ('govt_requests', '0', 'operational', 100.0)
ON CONFLICT (id) DO NOTHING;
