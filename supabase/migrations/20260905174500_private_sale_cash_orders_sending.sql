-- Claim cash orders before on-chain creditCash to prevent double-mint on retry.

ALTER TABLE public.private_sale_cash_orders DROP CONSTRAINT IF EXISTS private_sale_cash_orders_status_check;
ALTER TABLE public.private_sale_cash_orders
  ADD CONSTRAINT private_sale_cash_orders_status_check
  CHECK (status IN ('logged', 'sending', 'sent', 'canceled'));
