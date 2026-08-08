-- PostgREST Prefer: return=representation needs SELECT after INSERT.
-- Also allows public greeter / duplicate checks against waitlist emails.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'waitlist_signups'
      AND policyname = 'Anyone can check waitlist email'
  ) THEN
    CREATE POLICY "Anyone can check waitlist email"
      ON public.waitlist_signups
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END
$$;
