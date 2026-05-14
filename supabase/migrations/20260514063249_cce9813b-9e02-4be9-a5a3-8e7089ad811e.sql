
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS comments_disabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS ip_address text;

CREATE INDEX IF NOT EXISTS comments_post_ip_idx ON public.comments (post_id, ip_address);

CREATE OR REPLACE FUNCTION public.enforce_one_nick_per_ip()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  existing_nick text;
  post_blocked boolean;
BEGIN
  SELECT comments_disabled INTO post_blocked FROM public.posts WHERE id = NEW.post_id;
  IF post_blocked THEN
    RAISE EXCEPTION '이 글은 댓글이 비활성화되어 있습니다';
  END IF;

  IF NEW.ip_address IS NOT NULL THEN
    SELECT nickname INTO existing_nick
      FROM public.comments
      WHERE post_id = NEW.post_id
        AND ip_address = NEW.ip_address
        AND nickname <> NEW.nickname
      LIMIT 1;
    IF existing_nick IS NOT NULL THEN
      RAISE EXCEPTION '같은 네트워크에서 이미 "%" 닉네임으로 댓글을 작성했습니다. 동일 닉네임을 사용해 주세요.', existing_nick;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comments_enforce_nick_per_ip ON public.comments;
CREATE TRIGGER comments_enforce_nick_per_ip
BEFORE INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.enforce_one_nick_per_ip();
