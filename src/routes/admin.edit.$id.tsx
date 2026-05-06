import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { PostEditor } from "@/components/PostEditor";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/edit/$id")({
  component: EditPostPage,
});

function EditPostPage() {
  const { id } = Route.useParams();
  const { isAdmin, loading } = useAuth();
  if (loading) return <Layout><p>...</p></Layout>;
  if (!isAdmin) return <Navigate to="/login" />;
  return <Layout><PostEditor postId={id} /></Layout>;
}
