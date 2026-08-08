-- Idempotent launch-drip keys so re-seeding does not duplicate scheduled posts.
ALTER TABLE public.channel_posts
  ADD COLUMN IF NOT EXISTS campaign_key text;

CREATE UNIQUE INDEX IF NOT EXISTS channel_posts_company_campaign_key_uidx
  ON public.channel_posts (company_id, campaign_key)
  WHERE campaign_key IS NOT NULL;
