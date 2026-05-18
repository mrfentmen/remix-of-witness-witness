
-- Profiles: per-user auth metadata + wrapped master encryption key
CREATE TABLE public.profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  email TEXT,
  -- Cloud-wrapped master key (used to recover encrypted recordings on reinstall)
  wrapped_master_key TEXT,  -- base64 ciphertext
  key_salt TEXT,            -- base64 PBKDF2 salt
  key_iv TEXT,              -- base64 AES-GCM iv used to wrap the master key
  pin_set BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Recordings: metadata + S3 key (no blob).
CREATE TABLE public.recordings (
  id UUID NOT NULL PRIMARY KEY,                    -- matches client-generated UUID
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_at TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  encrypted BOOLEAN NOT NULL,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  gps_accuracy DOUBLE PRECISION,
  thumbnail_data_url TEXT,
  s3_key TEXT,
  uploaded_at TIMESTAMPTZ
);

CREATE INDEX recordings_user_created_idx ON public.recordings(user_id, recorded_at DESC);

ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own recordings" ON public.recordings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own recordings" ON public.recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own recordings" ON public.recordings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own recordings" ON public.recordings
  FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, phone, email)
  VALUES (NEW.id, NEW.phone, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
