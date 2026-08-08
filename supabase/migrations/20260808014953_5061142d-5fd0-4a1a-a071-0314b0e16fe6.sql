-- 1) contest_stakes: no more public read of backer identities
DROP POLICY IF EXISTS "stakes public read" ON public.contest_stakes;
CREATE POLICY "stakes own read" ON public.contest_stakes
  FOR SELECT TO authenticated USING (backer_id = auth.uid());
REVOKE SELECT ON public.contest_stakes FROM anon;

-- 2) wallet_bindings: owner-only raw read; public sees masked addresses via a view
DROP POLICY IF EXISTS "wallets public read verified" ON public.wallet_bindings;
CREATE POLICY "wallets owner read" ON public.wallet_bindings
  FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE SELECT ON public.wallet_bindings FROM anon;

CREATE OR REPLACE VIEW public.public_handle_wallets AS
  SELECT w.id,
         w.handle_id,
         w.slot,
         w.role,
         w.chain,
         w.verified,
         left(w.address, 6) || '…' || right(w.address, 4) AS address_short
    FROM public.wallet_bindings w
    JOIN public.handles h ON h.id = w.handle_id AND h.is_public
   WHERE w.verified;

GRANT SELECT ON public.public_handle_wallets TO anon, authenticated;