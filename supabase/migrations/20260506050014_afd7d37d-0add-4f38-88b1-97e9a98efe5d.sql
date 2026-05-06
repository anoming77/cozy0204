
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "user_roles select self or admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories admin insert" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "categories admin update" ON public.categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "categories admin delete" ON public.categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Posts
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  thumbnail_url TEXT,
  view_count INT NOT NULL DEFAULT 0,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_posts_category ON public.posts(category_id);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);

CREATE POLICY "posts public read" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts admin insert" ON public.posts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "posts admin update" ON public.posts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "posts admin delete" ON public.posts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Media
CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image','video','link')),
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media public read" ON public.media FOR SELECT USING (true);
CREATE POLICY "media admin insert" ON public.media FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "media admin update" ON public.media FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "media admin delete" ON public.media FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_comments_post ON public.comments(post_id);
CREATE POLICY "comments public read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments anyone insert" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "comments admin delete" ON public.comments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Reactions
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like','empathy','cheer','helpful')),
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, session_id, type)
);
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_reactions_post ON public.reactions(post_id);
CREATE POLICY "reactions public read" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "reactions anyone insert" ON public.reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "reactions anyone delete" ON public.reactions FOR DELETE USING (true);

-- View counter RPC
CREATE OR REPLACE FUNCTION public.increment_view_count(_post_id UUID)
RETURNS VOID LANGUAGE SQL AS $$
  UPDATE public.posts SET view_count = view_count + 1 WHERE id = _post_id;
$$;

-- Seed default categories
INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('전체', 'all', 0),
  ('개발', 'dev', 1),
  ('디자인', 'design', 2),
  ('일상', 'life', 3),
  ('독서', 'reading', 4);
