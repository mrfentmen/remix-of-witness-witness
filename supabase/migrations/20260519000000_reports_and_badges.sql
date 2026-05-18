-- Reports: user-submitted incident reports on map pins (recordings & streams)
CREATE TABLE public.reports (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('recording', 'stream')),
  target_id UUID NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reports_target_idx ON public.reports(target_type, target_id);
CREATE INDEX reports_created_idx ON public.reports(created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone insert reports" ON public.reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone read reports" ON public.reports
  FOR SELECT USING (true);

-- Add badges JSONB field to profiles for verified user badges
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;

-- Helper: function to check if a user has a specific badge
CREATE OR REPLACE FUNCTION public.user_has_badge(target_user_id UUID, badge_name TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = target_user_id
    AND badges @> jsonb_build_array(jsonb_build_object('name', badge_name))
  );
END;
$$;
