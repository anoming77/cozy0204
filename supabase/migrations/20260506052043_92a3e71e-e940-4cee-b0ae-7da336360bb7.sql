
INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "post-media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-media');

CREATE POLICY "post-media admin insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "post-media admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'post-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "post-media admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'post-media' AND public.has_role(auth.uid(), 'admin'));
