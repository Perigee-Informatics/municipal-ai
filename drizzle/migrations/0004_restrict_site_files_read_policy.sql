CREATE OR REPLACE FUNCTION public.site_file_is_public(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profile
    WHERE id = 1
      AND (photo_url = 'storage:' || _path OR cv_path = 'storage:' || _path)
  );
$$;

DROP POLICY IF EXISTS "public read site files" ON storage.objects;

CREATE POLICY "public read site files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'site-files'
  AND (
    public.site_file_is_public(name)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);