-- Wallet bindings must belong to the authenticated user AND their handle.
DROP POLICY IF EXISTS "wallets owner insert" ON public.wallet_bindings;
CREATE POLICY "wallets owner insert" ON public.wallet_bindings
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.handles h
      WHERE h.id = handle_id AND h.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "wallets owner update" ON public.wallet_bindings;
CREATE POLICY "wallets owner update" ON public.wallet_bindings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.handles h
      WHERE h.id = handle_id AND h.user_id = auth.uid()
    )
  );
