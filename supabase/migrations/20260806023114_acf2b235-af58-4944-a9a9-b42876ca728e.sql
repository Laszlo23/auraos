CREATE TABLE public.fio_attestations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  handle_id uuid not null references public.handles(id) on delete cascade,
  wallet_id uuid references public.wallet_bindings(id) on delete set null,
  fio_handle text not null,
  chain_code text not null default 'ETH',
  token_code text not null default 'ETH',
  resolved_address text,
  verified boolean not null default false,
  attested_at timestamptz,
  created_at timestamptz not null default now(),
  unique (handle_id, fio_handle, chain_code, token_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fio_attestations TO authenticated;
GRANT SELECT ON public.fio_attestations TO anon;
GRANT ALL ON public.fio_attestations TO service_role;

ALTER TABLE public.fio_attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their FIO attestations"
  ON public.fio_attestations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Verified FIO attestations are public on public handles"
  ON public.fio_attestations FOR SELECT TO anon
  USING (verified AND EXISTS (
    SELECT 1 FROM public.handles h
    WHERE h.id = fio_attestations.handle_id AND h.is_public
  ));