"use client";

import { useEffect, useState } from "react";
import { Coins, Flame, Activity, ShieldCheck, Loader2 } from "lucide-react";
import { useApiClient, type UsageSnapshot } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AboutCreditsLink } from "@/components/usage/AboutCreditsLink";

export function QuotaPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  return <QuotaPanelInner key={refreshKey} />;
}

function QuotaPanelInner() {
  const api = useApiClient();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ok"; usage: UsageSnapshot }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    api
      .getMyUsage()
      .then((u) => {
        if (!cancelled) setState({ kind: "ok", usage: u });
      })
      .catch(() => {
        if (!cancelled)
          setState({ kind: "error", message: "Could not load usage." });
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const usage = state.kind === "ok" ? state.usage : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Coins className="h-4 w-4" />
          Usage
        </CardTitle>
        <div className="flex items-center gap-3">
          <AboutCreditsLink />
          {usage?.is_admin && (
            <Badge variant="default" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              Admin (unlimited)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {state.kind === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}
        {state.kind === "error" && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
        {usage && (
          <div className="grid gap-4 sm:grid-cols-3">
            <CountTile
              icon={<Flame className="h-4 w-4 text-orange-500" />}
              label="Motors"
              count={usage.motor_count}
              limit={usage.motor_limit}
              isAdmin={usage.is_admin}
            />
            <CountTile
              icon={<Activity className="h-4 w-4 text-blue-500" />}
              label="Simulations"
              count={usage.simulation_count}
              limit={usage.simulation_limit}
              isAdmin={usage.is_admin}
            />
            <UsageTile
              label="Tokens used"
              used={usage.credits.tokens_used}
              limit={usage.credits.monthly_token_limit}
              remaining={usage.credits.tokens_remaining}
              footer={
                <>
                  Usage for{" "}
                  <span className="font-mono">
                    {usage.credits.usage_period}
                  </span>{" "}
                  · resets monthly
                </>
              }
              isAdmin={usage.is_admin}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CountTile({
  icon,
  label,
  count,
  limit,
  isAdmin,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  limit: number | null;
  isAdmin: boolean;
}) {
  const unlimited = isAdmin || limit == null;
  const pct =
    !unlimited && limit! > 0
      ? Math.min(100, Math.round((count / limit!) * 100))
      : null;
  const atCap = !unlimited && count >= limit!;
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        {atCap && (
          <Badge variant="destructive" className="text-[10px]">
            at limit
          </Badge>
        )}
      </div>
      <p className="text-lg font-semibold tabular-nums">
        {count.toLocaleString()}
        <span className="ml-1 text-sm font-normal text-muted-foreground">
          / {unlimited ? "∞" : limit!.toLocaleString()}
        </span>
      </p>
      {pct != null && (
        <div
          className="h-1 w-full overflow-hidden rounded bg-muted"
          aria-hidden="true"
        >
          <div
            className={`h-full ${atCap ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function UsageTile({
  label,
  used,
  limit,
  remaining,
  footer,
  isAdmin,
}: {
  label: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  footer?: React.ReactNode;
  isAdmin: boolean;
}) {
  const unlimited = isAdmin || limit == null;
  const pct =
    !unlimited && limit! > 0
      ? Math.min(100, Math.round((used / limit!) * 100))
      : null;
  const atCap = !unlimited && remaining != null && remaining <= 0;
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {atCap && (
          <Badge variant="destructive" className="text-[10px]">
            at limit
          </Badge>
        )}
      </div>
      <p className="text-lg font-semibold tabular-nums">
        {used.toLocaleString()}
        <span className="ml-1 text-sm font-normal text-muted-foreground">
          / {unlimited ? "∞" : limit!.toLocaleString()} tokens
        </span>
      </p>
      {pct != null && (
        <div
          className="h-1 w-full overflow-hidden rounded bg-muted"
          aria-hidden="true"
        >
          <div
            className={`h-full ${atCap ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {remaining != null && (
        <p className="text-[11px] text-muted-foreground">
          {remaining.toLocaleString()} tokens left this period
        </p>
      )}
      {footer && (
        <p className="text-[11px] text-muted-foreground">{footer}</p>
      )}
    </div>
  );
}
