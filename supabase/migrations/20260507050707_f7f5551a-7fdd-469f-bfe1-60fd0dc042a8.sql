
-- D: add 'private' to post_status enum
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'private';

-- E: featured flag
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_posts_featured ON public.posts(is_featured) WHERE is_featured = true;

-- Trigger to keep at most 3 featured posts (oldest auto-unfeature)
CREATE OR REPLACE FUNCTION public.enforce_featured_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  victim uuid;
BEGIN
  IF NEW.is_featured = true AND (TG_OP = 'INSERT' OR OLD.is_featured = false) THEN
    LOOP
      SELECT id INTO victim FROM public.posts
        WHERE is_featured = true AND id <> NEW.id
        ORDER BY updated_at ASC
        OFFSET 2 LIMIT 1;
      EXIT WHEN victim IS NULL;
      UPDATE public.posts SET is_featured = false WHERE id = victim;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_featured_limit ON public.posts;
CREATE TRIGGER posts_featured_limit
AFTER INSERT OR UPDATE OF is_featured ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.enforce_featured_limit();

-- F: comments author info
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS author_role text;

-- J: site_pages table for editable singletons (about, etc.)
CREATE TABLE IF NOT EXISTS public.site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_pages public read" ON public.site_pages;
CREATE POLICY "site_pages public read" ON public.site_pages FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_pages admin insert" ON public.site_pages;
CREATE POLICY "site_pages admin insert" ON public.site_pages FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "site_pages admin update" ON public.site_pages;
CREATE POLICY "site_pages admin update" ON public.site_pages FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER site_pages_updated_at
BEFORE UPDATE ON public.site_pages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_pages (slug, content) VALUES
('about', '<p>이 공간은 학습 아카이브입니다. 운영자 소개를 자유롭게 수정해 주세요.</p>')
ON CONFLICT (slug) DO NOTHING;

-- Update posts public read policy: only 'published' is public (private/draft hidden)
-- Existing policy already restricts to status='published'; private will be hidden by default. Good.
