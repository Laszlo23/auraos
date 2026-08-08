CREATE TABLE public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text NOT NULL DEFAULT 'landing',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX waitlist_signups_email_key ON public.waitlist_signups (lower(email));
GRANT INSERT ON public.waitlist_signups TO anon, authenticated;
GRANT ALL ON public.waitlist_signups TO service_role;
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can join the waitlist" ON public.waitlist_signups FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE public.invite_codes (
  code text PRIMARY KEY,
  label text,
  max_uses integer NOT NULL DEFAULT 100,
  uses integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.invite_codes TO service_role;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access to invite codes" ON public.invite_codes FOR SELECT TO authenticated USING (false);

INSERT INTO public.invite_codes (code, label, max_uses) VALUES
  ('AURORA', 'Founding cohort', 2000),
  ('ATLAS', 'Atlas referral', 500),
  ('QUANT', 'Trading desk early access', 500);

CREATE OR REPLACE FUNCTION public.redeem_invite_code(_code text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE ok boolean;
BEGIN
  UPDATE public.invite_codes
     SET uses = uses + 1
   WHERE upper(trim(_code)) = code
     AND active
     AND uses < max_uses
  RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END; $$;
REVOKE ALL ON FUNCTION public.redeem_invite_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(text) TO anon, authenticated;

CREATE TABLE public.wheel_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  spun_on date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  prize_kind text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, spun_on)
);
GRANT SELECT, INSERT ON public.wheel_spins TO authenticated;
GRANT ALL ON public.wheel_spins TO service_role;
ALTER TABLE public.wheel_spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their spins" ON public.wheel_spins FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));