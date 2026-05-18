ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS gps_track JSONB;

CREATE INDEX IF NOT EXISTS idx_recordings_category ON public.recordings(category);