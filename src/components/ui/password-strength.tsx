"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/locale-provider";

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

/** Lightweight password strength heuristic. No external deps. */
export function scorePassword(value: string): PasswordScore {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  const classes =
    (/[a-z]/.test(value) ? 1 : 0) +
    (/[A-Z]/.test(value) ? 1 : 0) +
    (/\d/.test(value) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(value) ? 1 : 0);
  if (classes >= 2) score++;
  if (classes >= 3) score++;
  if (value.length < 6) score = Math.min(score, 1);
  return Math.min(score, 4) as PasswordScore;
}

const BAR_COLORS = [
  "bg-muted",
  "bg-destructive",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-green-600",
] as const;

export function PasswordStrength({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const score = scorePassword(value);
  const labels: Record<PasswordScore, string> = {
    0: t("password.strength.empty"),
    1: t("password.strength.weak"),
    2: t("password.strength.fair"),
    3: t("password.strength.good"),
    4: t("password.strength.strong"),
  };

  return (
    <div className={cn("space-y-1", className)} aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              score >= i ? BAR_COLORS[score] : "bg-muted",
            )}
          />
        ))}
      </div>
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">{labels[score]}</p>
      )}
    </div>
  );
}
