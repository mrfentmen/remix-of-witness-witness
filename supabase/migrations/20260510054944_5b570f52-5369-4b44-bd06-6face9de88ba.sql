
-- 1. Public-on-map toggle for recordings
ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE INDEX IF NOT EXISTS recordings_public_recent_idx
  ON public.recordings (recorded_at DESC)
  WHERE is_public = true;

-- Public can read recordings that the owner explicitly made public.
DROP POLICY IF EXISTS "Public recordings are world-readable" ON public.recordings;
CREATE POLICY "Public recordings are world-readable"
  ON public.recordings
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- 2. Live streams table
CREATE TABLE IF NOT EXISTS public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mux_stream_id text,
  playback_id text NOT NULL,
  title text,
  gps_lat double precision,
  gps_lng double precision,
  gps_accuracy double precision,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_streams_active_idx
  ON public.live_streams (started_at DESC)
  WHERE ended_at IS NULL;

CREATE TRIGGER live_streams_updated_at
  BEFORE UPDATE ON public.live_streams
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- Anyone can see currently active streams (so the public map works for unauthenticated viewers).
CREATE POLICY "Active streams are world-readable"
  ON public.live_streams
  FOR SELECT
  TO anon, authenticated
  USING (ended_at IS NULL);

-- Owners can read their full history.
CREATE POLICY "Owners read their own streams"
  ON public.live_streams
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners insert their own streams"
  ON public.live_streams
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners update their own streams"
  ON public.live_streams
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners delete their own streams"
  ON public.live_streams
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
