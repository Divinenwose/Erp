ALTER TABLE public.companies ALTER COLUMN currency SET DEFAULT 'NGN';
ALTER TABLE public.companies ALTER COLUMN timezone SET DEFAULT 'Africa/Lagos';
ALTER TABLE public.companies ALTER COLUMN country SET DEFAULT 'Nigeria';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('company-logos', 'company-logos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS company_logos_public_read ON storage.objects;
CREATE POLICY company_logos_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS company_logos_company_insert ON storage.objects;
CREATE POLICY company_logos_company_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = public.user_company_id()::text
  );

DROP POLICY IF EXISTS company_logos_company_update ON storage.objects;
CREATE POLICY company_logos_company_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = public.user_company_id()::text
  )
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = public.user_company_id()::text
  );

DROP POLICY IF EXISTS company_logos_company_delete ON storage.objects;
CREATE POLICY company_logos_company_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = public.user_company_id()::text
  );