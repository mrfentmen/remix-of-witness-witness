
-- VAPID keypair storage (service-role only; auto-generated on first push send)
CREATE TABLE IF NOT EXISTS public.vapid_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key text NOT NULL,
  private_key text NOT NULL,
  subject text NOT NULL DEFAULT 'mailto:contactae2000@gmail.com',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vapid_keys ENABLE ROW LEVEL SECURITY;
-- No policies: only service-role (server) can read/write.

-- Web Push subscriptions per user/device
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  notif_sos boolean NOT NULL DEFAULT true,
  notif_share_request boolean NOT NULL DEFAULT true,
  notif_live_nearby boolean NOT NULL DEFAULT false,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own push subs"
  ON public.push_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own push subs"
  ON public.push_subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own push subs"
  ON public.push_subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own push subs"
  ON public.push_subscriptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_push_subs_updated
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
