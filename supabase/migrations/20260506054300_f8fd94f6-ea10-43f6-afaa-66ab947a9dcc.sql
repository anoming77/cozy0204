
-- Add status to posts
DO $$ BEGIN
  CREATE TYPE public.post_status AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS status public.post_status NOT NULL DEFAULT 'published';

-- Drop existing public read policy and replace with status-aware ones
DROP POLICY IF EXISTS "posts public read" ON public.posts;

CREATE POLICY "posts public read published"
  ON public.posts FOR SELECT
  TO public
  USING (status = 'published');

CREATE POLICY "posts admin read all"
  ON public.posts FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ON DELETE SET NULL for category_id
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_category_id_fkey;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
