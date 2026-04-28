"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useApiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const POLL_INTERVAL_MS = 10_000;

type HealthStatus = "ok" | "down" | "checking";

export function HealthCheckCard() {
  const api = useApiClient();
  const [status, setStatus] = useState<HealthStatus>("checking");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await api.health();
      setStatus(res.status === "ok" ? "ok" : "down");
    } catch {
      setStatus("down");
    } finally {
      setLastChecked(new Date());
    }
  }, [api]);

  useEffect(() => {
    // Defer the first call to the next tick so the effect body itself
    // doesn't trigger the cascading-render lint; the polling timer covers
    // every subsequent tick.
    const initialId = setTimeout(check, 0);
    const intervalId = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initialId);
      clearInterval(intervalId);
    };
  }, [check]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Backend health</CardTitle>
        <CardDescription>
          Polls <code className="font-mono text-xs">/health</code> every{" "}
          {Math.round(POLL_INTERVAL_MS / 1000)}s.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4">
          <StatusDot status={status} />
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium",
                status === "ok" && "text-emerald-600 dark:text-emerald-400",
                status === "down" && "text-destructive",
                status === "checking" && "text-muted-foreground",
              )}
            >
              {labelFor(status)}
            </p>
            <p className="text-xs text-muted-foreground">
              {lastChecked
                ? `Last checked ${lastChecked.toLocaleTimeString()}`
                : "Awaiting first check…"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={check}>
            <RefreshCw
              className={cn(
                "mr-2 h-3 w-3",
                status === "checking" && "animate-spin",
              )}
            />
            Check now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusDot({ status }: { status: HealthStatus }) {
  const dot =
    status === "ok"
      ? "bg-green-500"
      : status === "down"
        ? "bg-red-500"
        : "bg-muted-foreground";
  const ring =
    status === "ok"
      ? "bg-green-400"
      : status === "down"
        ? "bg-red-400"
        : "bg-muted-foreground/40";
  const animated = status !== "checking";

  return (
    <span className="relative flex h-3 w-3" aria-hidden>
      {animated && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
            ring,
          )}
        />
      )}
      <span
        className={cn("relative inline-flex h-3 w-3 rounded-full", dot)}
      />
    </span>
  );
}

function labelFor(status: HealthStatus): string {
  switch (status) {
    case "ok":
      return "Online";
    case "down":
      return "Offline";
    case "checking":
      return "Checking…";
  }
}
