ALTER TABLE public.fio_attestations
  ADD COLUMN last_checked_at timestamptz,
  ADD COLUMN status text NOT NULL DEFAULT 'valid',
  ADD COLUMN previous_address text;

UPDATE public.fio_attestations SET status = CASE WHEN verified THEN 'valid' ELSE 'unmapped' END;

CREATE INDEX fio_attestations_last_checked_idx ON public.fio_attestations (last_checked_at NULLS FIRST);