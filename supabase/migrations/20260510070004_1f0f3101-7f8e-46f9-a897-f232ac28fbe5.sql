-- 1. profiles: optional home address
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_address text;

-- 2. share invite status
DO $$ BEGIN
  CREATE TYPE public.location_share_status AS ENUM ('pending','accepted','declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. location_shares
CREATE TABLE IF NOT EXISTS public.location_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  status public.location_share_status NOT NULL DEFAULT 'pending',
  requester_alias text,
  recipient_alias text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (requester_id <> recipient_id),
  UNIQUE (requester_id, recipient_id)
);
CREATE INDEX IF NOT EXISTS location_shares_recipient_idx ON public.location_shares(recipient_id);
CREATE INDEX IF NOT EXISTS location_shares_requester_idx ON public.location_shares(requester_id);

ALTER TABLE public.location_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own shares" ON public.location_shares
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Update own shares" ON public.location_shares
  FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Delete own shares" ON public.location_shares
  FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- inserts only via RPC (no INSERT policy)

-- 4. contact_locations
CREATE TABLE IF NOT EXISTS public.contact_locations (
  user_id uuid PRIMARY KEY,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  sos_active boolean NOT NULL DEFAULT false,
  sos_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_locations ENABLE ROW LEVEL SECURITY;

-- security definer helper to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_accepted_share(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.location_shares
    WHERE status = 'accepted'
      AND ((requester_id = _viewer AND recipient_id = _target)
        OR (requester_id = _target AND recipient_id = _viewer))
  )
$$;

CREATE POLICY "Read own or shared location" ON public.contact_locations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_accepted_share(auth.uid(), user_id));

CREATE POLICY "Insert own location" ON public.contact_locations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own location" ON public.contact_locations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Delete own location" ON public.contact_locations
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 5. invite by phone
CREATE OR REPLACE FUNCTION public.request_location_share(
  _phone text,
  _alias text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _target uuid;
  _share_id uuid;
  _me uuid := auth.uid();
  _normalized text := regexp_replace(coalesce(_phone,''), '[^0-9+]', '', 'g');
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF length(_normalized) < 5 THEN
    RAISE EXCEPTION 'Phone number too short' USING ERRCODE = '22023';
  END IF;

  SELECT user_id INTO _target FROM public.profiles
  WHERE regexp_replace(coalesce(phone,''), '[^0-9+]', '', 'g') = _normalized
  LIMIT 1;

  IF _target IS NULL THEN
    RAISE EXCEPTION 'No Witness user found with that phone number' USING ERRCODE = 'P0002';
  END IF;
  IF _target = _me THEN
    RAISE EXCEPTION 'You cannot invite yourself' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.location_shares (requester_id, recipient_id, requester_alias, status)
  VALUES (_me, _target, _alias, 'pending')
  ON CONFLICT (requester_id, recipient_id)
    DO UPDATE SET requester_alias = COALESCE(EXCLUDED.requester_alias, location_shares.requester_alias)
  RETURNING id INTO _share_id;

  RETURN _share_id;
END;
$$;

-- 6. accept / decline
CREATE OR REPLACE FUNCTION public.respond_location_share(
  _share_id uuid,
  _accept boolean,
  _alias text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.location_shares
  SET status = CASE WHEN _accept THEN 'accepted'::public.location_share_status
                    ELSE 'declined'::public.location_share_status END,
      recipient_alias = COALESCE(_alias, recipient_alias),
      responded_at = now()
  WHERE id = _share_id AND recipient_id = auth.uid();
END;
$$;

-- 7. set my SOS state on my own location row
CREATE OR REPLACE FUNCTION public.set_my_sos_state(_active boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  UPDATE public.contact_locations
  SET sos_active = _active,
      sos_at = CASE WHEN _active THEN now() ELSE NULL END,
      updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- 8. listing RPC: returns my shares with peer profile + location
CREATE OR REPLACE FUNCTION public.get_shared_contacts()
RETURNS TABLE (
  share_id uuid,
  contact_user_id uuid,
  alias text,
  phone text,
  home_address text,
  status public.location_share_status,
  direction text,
  latitude double precision,
  longitude double precision,
  sos_active boolean,
  sos_at timestamptz,
  location_updated_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    s.id,
    CASE WHEN s.requester_id = auth.uid() THEN s.recipient_id ELSE s.requester_id END,
    CASE WHEN s.requester_id = auth.uid() THEN s.requester_alias ELSE s.recipient_alias END,
    p.phone,
    CASE WHEN s.status = 'accepted' THEN p.home_address ELSE NULL END,
    s.status,
    CASE WHEN s.requester_id = auth.uid() THEN 'outgoing' ELSE 'incoming' END,
    CASE WHEN s.status = 'accepted' THEN cl.latitude END,
    CASE WHEN s.status = 'accepted' THEN cl.longitude END,
    CASE WHEN s.status = 'accepted' THEN cl.sos_active END,
    CASE WHEN s.status = 'accepted' THEN cl.sos_at END,
    CASE WHEN s.status = 'accepted' THEN cl.updated_at END,
    s.created_at
  FROM public.location_shares s
  JOIN public.profiles p ON p.user_id = (CASE WHEN s.requester_id = auth.uid() THEN s.recipient_id ELSE s.requester_id END)
  LEFT JOIN public.contact_locations cl ON cl.user_id = p.user_id
  WHERE s.requester_id = auth.uid() OR s.recipient_id = auth.uid()
  ORDER BY s.created_at DESC;
$$;