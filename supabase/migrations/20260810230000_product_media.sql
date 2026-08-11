-- Product catalogue media (image + video) + public storage bucket

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS video_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-assets', 'product-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "product assets read" ON storage.objects;
CREATE POLICY "product assets read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-assets');

DROP POLICY IF EXISTS "product assets owner write" ON storage.objects;
CREATE POLICY "product assets owner write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "product assets owner update" ON storage.objects;
CREATE POLICY "product assets owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "product assets owner delete" ON storage.objects;
CREATE POLICY "product assets owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.companies WHERE owner_id = auth.uid()
    )
  );
