import { db } from "@/lib/db";

export const runtime = "nodejs";

// Serves an uploaded image stored in the database (bytes) — used because
// Netlify's serverless filesystem is read-only, so we can't write to /public.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const up = await db.upload.findUnique({ where: { id } });
  if (!up) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(up.data), {
    headers: {
      "content-type": up.mimeType || "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
