"use client";

import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Status = {
  status: number | null;
  ok: boolean;
  error?: string;
  durationMs: number;
};

type State =
  | { kind: "loading" }
  | { kind: "done"; data: Status }
  | { kind: "error"; message: string };

const REFRESH_MS = 60_000;

export function TileStatusIndicator({
  tileId,
  className,
}: {
  tileId: string;
  className?: string;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch(
          `/api/tile-status?id=${encodeURIComponent(tileId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          if (cancelled) return;
          setState({ kind: "error", message: `HTTP ${res.status}` });
          return;
        }
        const data = (await res.json()) as Status;
        if (cancelled) return;
        setState({ kind: "done", data });
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed",
        });
      }
    };

    run();
    const interval = setInterval(run, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tileId]);

  let color = "bg-muted-foreground/40";
  let pulse = true;
  let label = "Checking…";

  if (state.kind === "done") {
    pulse = false;
    const { status, ok, error, durationMs } = state.data;
    if (error || status === null) {
      color = "bg-red-500";
      label = error ?? "Unreachable";
    } else if (ok) {
      color = "bg-emerald-500";
      label = `${status} · ${durationMs}ms`;
    } else if (status >= 500) {
      color = "bg-red-500";
      label = `${status} · ${durationMs}ms`;
    } else if (status >= 400) {
      color = "bg-amber-500";
      label = `${status} · ${durationMs}ms`;
    } else if (status >= 300) {
      color = "bg-sky-500";
      label = `${status} · ${durationMs}ms`;
    } else {
      color = "bg-muted-foreground/60";
      label = `${status} · ${durationMs}ms`;
    }
  } else if (state.kind === "error") {
    pulse = false;
    color = "bg-red-500";
    label = state.message;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`pointer-events-auto inline-block size-2 rounded-full ring-2 ring-background ${color} ${pulse ? "animate-pulse" : ""} ${className ?? ""}`}
          aria-label={label}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
