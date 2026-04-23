import { request as httpRequest } from "node:http";
import { request as httpsRequest, Agent as HttpsAgent } from "node:https";
import type { IncomingMessage } from "node:http";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

type StatusResult = {
  status: number | null;
  ok: boolean;
  error?: string;
  durationMs: number;
};

const TIMEOUT_MS = 10_000;
const USER_AGENT = "selfstack-status-check/1.0";

// Reusable HTTPS agent that tolerates self-signed certs commonly found on
// self-hosted LAN services. This is a local-network status probe, not a
// security boundary.
const insecureHttpsAgent = new HttpsAgent({
  rejectUnauthorized: false,
  keepAlive: false,
});

function probe(
  target: URL,
  method: "HEAD" | "GET",
): Promise<{ status: number; aborted?: boolean }> {
  return new Promise((resolve, reject) => {
    const isHttps = target.protocol === "https:";
    const doRequest = isHttps ? httpsRequest : httpRequest;

    const req = doRequest(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (isHttps ? 443 : 80),
        path: `${target.pathname || "/"}${target.search || ""}`,
        method,
        headers: {
          "user-agent": USER_AGENT,
          accept: "*/*",
          // Close connection quickly for HEAD checks.
          connection: "close",
        },
        timeout: TIMEOUT_MS,
        ...(isHttps ? { agent: insecureHttpsAgent } : {}),
      },
      (res: IncomingMessage) => {
        const status = res.statusCode ?? 0;
        // Drain & discard body so the socket can close.
        res.resume();
        resolve({ status });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error("Timeout"));
    });
    req.on("error", (err) => reject(err));
    req.end();
  });
}

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

  let target: URL;
  try {
    target = new URL(tile.url);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return Response.json({ error: "Unsupported protocol" }, { status: 400 });
  }

  const started = Date.now();
  const result: StatusResult = { status: null, ok: false, durationMs: 0 };

  try {
    // Try HEAD first (cheap).
    let { status } = await probe(target, "HEAD");

    // Many servers mishandle HEAD (some return 400/403/405/501 or close the
    // connection). If the HEAD response looks like a rejection of the method
    // itself, retry with GET before declaring the endpoint broken.
    if (
      status === 0 ||
      status === 400 ||
      status === 403 ||
      status === 405 ||
      status === 501
    ) {
      try {
        const r = await probe(target, "GET");
        status = r.status;
      } catch {
        // keep HEAD status if GET also fails
      }
    }

    result.status = status;
    result.ok = status >= 200 && status < 400;
  } catch (err) {
    result.error = err instanceof Error ? err.message : "Request failed";
  } finally {
    result.durationMs = Date.now() - started;
  }

  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
