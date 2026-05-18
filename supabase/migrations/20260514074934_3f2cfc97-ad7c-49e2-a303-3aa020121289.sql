-- biometric_credentials: WebAuthn credentials per user/device
CREATE TABLE public.biometric_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_label TEXT,
  transports TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
ALTER TABLE public.biometric_credentials ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_biometric_credentials_user ON public.biometric_credentials(user_id);

CREATE POLICY "Users read own biometric creds" ON public.biometric_credentials
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own biometric creds" ON public.biometric_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own biometric creds" ON public.biometric_credentials
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own biometric creds" ON public.biometric_credentials
  FOR DELETE USING (auth.uid() = user_id);

-- trusted_contacts: people who can approve PIN recovery
CREATE TABLE public.trusted_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_user_id UUID,
  contact_phone TEXT,
  contact_email TEXT,
  contact_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_trusted_contacts_user ON public.trusted_contacts(user_id);
CREATE INDEX idx_trusted_contacts_contact ON public.trusted_contacts(contact_user_id);

CREATE POLICY "Users read own trusted contacts" ON public.trusted_contacts
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = contact_user_id);
CREATE POLICY "Users insert own trusted contacts" ON public.trusted_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own trusted contacts" ON public.trusted_contacts
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = contact_user_id);
CREATE POLICY "Users delete own trusted contacts" ON public.trusted_contacts
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_trusted_contacts_updated_at
  BEFORE UPDATE ON public.trusted_contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- recovery_requests: PIN recovery flow
CREATE TABLE public.recovery_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trusted_contact_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','consumed','expired')),
  approval_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);
ALTER TABLE public.recovery_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_recovery_requests_user ON public.recovery_requests(user_id);
CREATE INDEX idx_recovery_requests_contact ON public.recovery_requests(trusted_contact_id);

CREATE POLICY "Users read own recovery requests" ON public.recovery_requests
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.trusted_contacts tc
      WHERE tc.id = recovery_requests.trusted_contact_id
        AND tc.contact_user_id = auth.uid()
    )
  );
CREATE POLICY "Users insert own recovery requests" ON public.recovery_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Trusted contacts update recovery requests" ON public.recovery_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.trusted_contacts tc
      WHERE tc.id = recovery_requests.trusted_contact_id
        AND tc.contact_user_id = auth.uid()
    )
  );

-- pin_lockout_state: failed PIN attempts + lockout
CREATE TABLE public.pin_lockout_state (
  user_id UUID NOT NULL PRIMARY KEY,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pin_lockout_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own lockout state" ON public.pin_lockout_state
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own lockout state" ON public.pin_lockout_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own lockout state" ON public.pin_lockout_state
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own lockout state" ON public.pin_lockout_state
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_pin_lockout_updated_at
  BEFORE UPDATE ON public.pin_lockout_state
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();