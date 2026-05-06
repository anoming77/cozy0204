
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.increment_view_count(UUID) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
