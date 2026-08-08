-- HANDLES ------------------------------------------------------------
CREATE TABLE public.handles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  handle text NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text NOT NULL,
  bio text,
  avatar text NOT NULL DEFAULT '◎',
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.handles TO authenticated;
GRANT SELECT ON public.handles TO anon;
GRANT ALL ON public.handles TO service_role;
ALTER TABLE public.handles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "handles public read" ON public.handles FOR SELECT USING (is_public OR user_id = auth.uid());
CREATE POLICY "handles owner insert" ON public.handles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "handles owner update" ON public.handles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "handles owner delete" ON public.handles FOR DELETE TO authenticated USING (user_id = auth.uid());

-- WALLET BINDINGS -----------------------------------------------------
CREATE TABLE public.wallet_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  handle_id uuid NOT NULL REFERENCES public.handles(id) ON DELETE CASCADE,
  slot integer NOT NULL CHECK (slot BETWEEN 1 AND 3),
  role text NOT NULL DEFAULT 'personal' CHECK (role IN ('treasury','rewards','personal')),
  chain text NOT NULL DEFAULT 'base-sepolia',
  address text NOT NULL,
  label text,
  verified boolean NOT NULL DEFAULT false,
  verify_nonce text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (handle_id, slot),
  UNIQUE (user_id, address)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_bindings TO authenticated;
GRANT SELECT ON public.wallet_bindings TO anon;
GRANT ALL ON public.wallet_bindings TO service_role;
ALTER TABLE public.wallet_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets public read verified" ON public.wallet_bindings FOR SELECT
  USING (user_id = auth.uid() OR (verified AND EXISTS (SELECT 1 FROM public.handles h WHERE h.id = handle_id AND h.is_public)));
CREATE POLICY "wallets owner insert" ON public.wallet_bindings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "wallets owner update" ON public.wallet_bindings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "wallets owner delete" ON public.wallet_bindings FOR DELETE TO authenticated USING (user_id = auth.uid());

-- SEASONS -------------------------------------------------------------
CREATE TABLE public.contest_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  theme text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  prize_pool integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('upcoming','live','ended')),
  rules text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contest_seasons TO anon, authenticated;
GRANT ALL ON public.contest_seasons TO service_role;
ALTER TABLE public.contest_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons public read" ON public.contest_seasons FOR SELECT USING (true);

-- ENTRIES -------------------------------------------------------------
CREATE TABLE public.contest_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.contest_seasons(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  handle_id uuid REFERENCES public.handles(id) ON DELETE SET NULL,
  pitch text,
  build_score numeric NOT NULL DEFAULT 0,
  revenue_score numeric NOT NULL DEFAULT 0,
  community_score numeric NOT NULL DEFAULT 0,
  momentum_score numeric NOT NULL DEFAULT 0,
  total_score numeric NOT NULL DEFAULT 0,
  staked_total integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, company_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contest_entries TO authenticated;
GRANT SELECT ON public.contest_entries TO anon;
GRANT ALL ON public.contest_entries TO service_role;
ALTER TABLE public.contest_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entries public read" ON public.contest_entries FOR SELECT USING (true);
CREATE POLICY "entries owner insert" ON public.contest_entries FOR INSERT TO authenticated WITH CHECK (public.owns_company(company_id));
CREATE POLICY "entries owner update" ON public.contest_entries FOR UPDATE TO authenticated USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));
CREATE POLICY "entries owner delete" ON public.contest_entries FOR DELETE TO authenticated USING (public.owns_company(company_id));

-- MILESTONES ----------------------------------------------------------
CREATE TABLE public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  handle_id uuid REFERENCES public.handles(id) ON DELETE SET NULL,
  season_id uuid REFERENCES public.contest_seasons(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'build' CHECK (kind IN ('build','revenue','launch','learning','win')),
  title text NOT NULL,
  body text,
  metric text,
  cheers integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestones TO authenticated;
GRANT SELECT ON public.milestones TO anon;
GRANT ALL ON public.milestones TO service_role;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "milestones public read" ON public.milestones FOR SELECT USING (true);
CREATE POLICY "milestones owner insert" ON public.milestones FOR INSERT TO authenticated WITH CHECK (public.owns_company(company_id));
CREATE POLICY "milestones owner update" ON public.milestones FOR UPDATE TO authenticated USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));
CREATE POLICY "milestones owner delete" ON public.milestones FOR DELETE TO authenticated USING (public.owns_company(company_id));

CREATE TABLE public.milestone_cheers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (milestone_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.milestone_cheers TO authenticated;
GRANT SELECT ON public.milestone_cheers TO anon;
GRANT ALL ON public.milestone_cheers TO service_role;
ALTER TABLE public.milestone_cheers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cheers public read" ON public.milestone_cheers FOR SELECT USING (true);
CREATE POLICY "cheers own insert" ON public.milestone_cheers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "cheers own delete" ON public.milestone_cheers FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_milestone_cheers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.milestones m
     SET cheers = (SELECT count(*) FROM public.milestone_cheers c WHERE c.milestone_id = m.id)
   WHERE m.id = COALESCE(NEW.milestone_id, OLD.milestone_id);
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_milestone_cheers() FROM public, anon, authenticated;
CREATE TRIGGER milestone_cheers_sync
AFTER INSERT OR DELETE ON public.milestone_cheers
FOR EACH ROW EXECUTE FUNCTION public.sync_milestone_cheers();

-- CHALLENGES ----------------------------------------------------------
CREATE TABLE public.contest_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.contest_seasons(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  brief text,
  xp_reward integer NOT NULL DEFAULT 100,
  token_reward integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (season_id, code)
);
GRANT SELECT ON public.contest_challenges TO anon, authenticated;
GRANT ALL ON public.contest_challenges TO service_role;
ALTER TABLE public.contest_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges public read" ON public.contest_challenges FOR SELECT USING (true);

CREATE TABLE public.challenge_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.contest_challenges(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, company_id)
);
GRANT SELECT, INSERT ON public.challenge_completions TO authenticated;
GRANT SELECT ON public.challenge_completions TO anon;
GRANT ALL ON public.challenge_completions TO service_role;
ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completions public read" ON public.challenge_completions FOR SELECT USING (true);
CREATE POLICY "completions owner insert" ON public.challenge_completions FOR INSERT TO authenticated WITH CHECK (public.owns_company(company_id));

-- STAKES --------------------------------------------------------------
CREATE TABLE public.contest_stakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.contest_seasons(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.contest_entries(id) ON DELETE CASCADE,
  backer_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, backer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contest_stakes TO authenticated;
GRANT SELECT ON public.contest_stakes TO anon;
GRANT ALL ON public.contest_stakes TO service_role;
ALTER TABLE public.contest_stakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stakes public read" ON public.contest_stakes FOR SELECT USING (true);
CREATE POLICY "stakes own insert" ON public.contest_stakes FOR INSERT TO authenticated WITH CHECK (backer_id = auth.uid());
CREATE POLICY "stakes own delete" ON public.contest_stakes FOR DELETE TO authenticated USING (backer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_entry_stakes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.contest_entries e
     SET staked_total = (SELECT COALESCE(sum(s.amount),0) FROM public.contest_stakes s WHERE s.entry_id = e.id)
   WHERE e.id = COALESCE(NEW.entry_id, OLD.entry_id);
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_entry_stakes() FROM public, anon, authenticated;
CREATE TRIGGER contest_stakes_sync
AFTER INSERT OR UPDATE OR DELETE ON public.contest_stakes
FOR EACH ROW EXECUTE FUNCTION public.sync_entry_stakes();

-- SCORE RECOMPUTE -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_entry_score(_entry_id uuid)
RETURNS public.contest_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e public.contest_entries;
  build numeric; rev numeric; comm numeric; mom numeric;
BEGIN
  SELECT * INTO e FROM public.contest_entries WHERE id = _entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'entry_not_found'; END IF;
  IF NOT public.owns_company(e.company_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  SELECT COALESCE(fp.xp,0) / 10.0 + COALESCE(array_length(fp.completed_quests,1),0) * 12
    INTO build FROM public.founder_progress fp WHERE fp.company_id = e.company_id;
  build := COALESCE(build,0) + (SELECT count(*) * 8 FROM public.tasks t WHERE t.company_id = e.company_id AND t.status = 'done');

  SELECT COALESCE(c.mrr,0) / 25.0 INTO rev FROM public.companies c WHERE c.id = e.company_id;
  rev := COALESCE(rev,0) + (SELECT COALESCE(sum(p.revenue),0) / 200.0 FROM public.products p WHERE p.company_id = e.company_id);

  SELECT count(*) * 14 + COALESCE(sum(m.cheers),0) * 3 INTO comm
    FROM public.milestones m WHERE m.company_id = e.company_id;
  comm := COALESCE(comm,0) + COALESCE(e.staked_total,0) / 100.0;

  SELECT count(*) * 6 INTO mom FROM public.activity_events a
   WHERE a.company_id = e.company_id AND a.created_at > now() - interval '7 days';
  mom := COALESCE(mom,0) + (SELECT count(*) * 18 FROM public.challenge_completions cc WHERE cc.company_id = e.company_id);

  UPDATE public.contest_entries
     SET build_score = round(build,1), revenue_score = round(rev,1),
         community_score = round(comm,1), momentum_score = round(mom,1),
         total_score = round(build + rev + comm + mom, 1), updated_at = now()
   WHERE id = _entry_id
  RETURNING * INTO e;
  RETURN e;
END; $$;
REVOKE EXECUTE ON FUNCTION public.recompute_entry_score(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recompute_entry_score(uuid) TO authenticated;

-- SEED SEASON ---------------------------------------------------------
INSERT INTO public.contest_seasons (slug, name, theme, starts_at, ends_at, prize_pool, status, rules)
VALUES ('genesis', 'Season 01 · Genesis', 'Build an autonomous company in public.', now() - interval '6 days', now() + interval '24 days', 250000, 'live',
  'Score = build + revenue + community + momentum. Post milestones publicly, complete challenges, let backers stake AURA on you.');

INSERT INTO public.contest_challenges (season_id, code, title, brief, xp_reward, token_reward, points, sort_order)
SELECT s.id, v.code, v.title, v.brief, v.xp, v.tok, v.pts, v.ord
FROM public.contest_seasons s,
(VALUES
  ('claim_handle','Claim your @handle','Register your public founder identity.',150,250,10,1),
  ('bind_wallet','Bind a verified wallet','Prove ownership of at least one wallet by signature.',200,500,15,2),
  ('first_milestone','Ship in public','Post your first public milestone.',150,300,12,3),
  ('first_revenue','First revenue','Record your first paying customer.',300,1000,25,4),
  ('connect_channel','Go omnichannel','Connect at least one social channel.',150,250,10,5),
  ('back_a_founder','Back a founder','Stake AURA on another company this season.',120,0,8,6)
) AS v(code,title,brief,xp,tok,pts,ord)
WHERE s.slug = 'genesis';