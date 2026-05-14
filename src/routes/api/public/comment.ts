import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({
  post_id: z.string().uuid(),
  nickname: z.string().trim().min(1).max(40),
  content: z.string().trim().min(1).max(2000),
  parent_id: z.string().uuid().nullable().optional(),
  user_id: z.string().uuid().nullable().optional(),
  author_role: z.string().max(20).nullable().optional(),
});

function getIp(request: Request): string | null {
  const h = request.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    null
  );
}

export const Route = createFileRoute("/api/public/comment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
        }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid input" }), { status: 400 });
        }
        const ip = getIp(request);
        const { error } = await supabaseAdmin.from("comments").insert({
          ...parsed.data,
          ip_address: ip,
        });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
