import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

type StatusResult = {
  status: number | null;
  ok: boolean;
  error?: string;
  durationMs: number;
};

export async function GET(request: Request) {
  try {
    await requireAuth();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const tile = await db.tile.findUnique({
    where: { id },
    select: { url: true, statusCheck: true },
  });

  if (!tile) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!tile.statusCheck || !tile.url) {
    return Response.json({ error: "Status check disabled" }, { status: 400 });
  }

  // Only allow http(s)
  let target: URL;
  try {
    target = new URL(tile.url);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return Response.json({ error: "Unsupported protocol" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const started = Date.now();

  const result: StatusResult = {
    status: null,
    ok: false,
    durationMs: 0,
  };

  try {
    let res = await fetch(target, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    // Many servers don't support HEAD; fall back to GET
    if (res.status === 405 || res.status === 501) {
      res = await fetch(target, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        cache: "no-store",
      });
    }
    result.status = res.status;
    result.ok = res.ok;
  } catch (err) {
    result.error = err instanceof Error ? err.message : "Request failed";
  } finally {
    clearTimeout(timeout);
    result.durationMs = Date.now() - started;
  }

  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
