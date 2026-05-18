
-- Server signing keys (Ed25519). Only the service role reads/writes these.
CREATE TABLE public.signing_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alg text NOT NULL DEFAULT 'Ed25519',
  public_key_b64 text NOT NULL,
  private_key_b64 text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.signing_keys ENABLE ROW LEVEL SECURITY;
-- (no policies: only service role can access)

-- Issued certificates. World-readable for verification.
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid NOT NULL,
  sha256 text NOT NULL,
  payload jsonb NOT NULL,
  signature_b64 text NOT NULL,
  key_id uuid NOT NULL REFERENCES public.signing_keys(id),
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recording_id, sha256)
);
CREATE INDEX certificates_sha256_idx ON public.certificates(sha256);
CREATE INDEX certificates_recording_idx ON public.certificates(recording_id);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Certificates are world-readable"
ON public.certificates
FOR SELECT
TO anon, authenticated
USING (true);
-- No insert/update/delete policies: only service role writes.
