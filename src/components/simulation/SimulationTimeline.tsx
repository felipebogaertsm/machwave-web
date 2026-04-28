"use client";

import { useEffect, useState } from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  isTerminalSimulationStatus,
  type SimulationStatus,
  type SimulationStatusEvent,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function statusVariant(status: SimulationStatus): BadgeProps["variant"] {
  switch (status) {
    case "done":
      return "success";
    case "failed":
      return "destructive";
    case "running":
      return "warning";
    case "retried":
      return "info";
    case "pending":
      return "secondary";
  }
}

function dotColorClass(status: SimulationStatus): string {
  switch (status) {
    case "done":
      return "bg-green-500";
    case "failed":
      return "bg-destructive";
    case "running":
      return "bg-yellow-500";
    case "retried":
      return "bg-blue-500";
    case "pending":
      return "bg-muted-foreground/50";
  }
}

function formatDuration(ms: number): string {
  const clamped = Math.max(0, ms);
  if (clamped < 1000) return `${clamped}ms`;
  const totalSeconds = Math.floor(clamped / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) {
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes === 0 ? `${hours}h` : `${hours}h ${remMinutes}m`;
}

function formatDateTime(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function transitionLabel(
  prevStatus: SimulationStatus,
  ms: number,
): string | null {
  const dur = formatDuration(ms);
  switch (prevStatus) {
    case "pending":
      return `queued ${dur}`;
    case "running":
      return `ran for ${dur}`;
    case "retried":
      return `re-queued ${dur}`;
    // Idle gap between a terminal event and a user-triggered retry isn't
    // meaningful — drop it.
    case "failed":
    case "done":
      return null;
  }
}

function useTickingNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}

interface SimulationTimelineProps {
  events: SimulationStatusEvent[];
  className?: string;
}

export function SimulationTimeline({
  events,
  className,
}: SimulationTimelineProps) {
  const last = events.length > 0 ? events[events.length - 1] : null;
  const lastActive = last != null && !isTerminalSimulationStatus(last.status);
  const now = useTickingNow(lastActive);

  if (events.length === 0 || last == null) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No status events yet.
      </div>
    );
  }

  const startMs = new Date(events[0].timestamp).getTime();
  const lastMs = new Date(last.timestamp).getTime();
  const totalMs = lastActive ? now - startMs : lastMs - startMs;
  const retryCount = events.filter((e) => e.status === "retried").length;

  // Precompute a retry-segment index per event so we can render the boundary
  // label without mutating during render.
  const retryNumberByIndex: number[] = [];
  let runningRetryNumber = 0;
  for (let i = 0; i < events.length; i++) {
    if (events[i].status === "retried" && i > 0) runningRetryNumber += 1;
    retryNumberByIndex.push(runningRetryNumber);
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Status</span>
          <Badge variant={statusVariant(last.status)} className="capitalize">
            {last.status}
          </Badge>
        </div>
        <div className="text-muted-foreground">
          Total{" "}
          <span className="font-mono tabular-nums text-foreground">
            {formatDuration(totalMs)}
          </span>
        </div>
        <div className="text-muted-foreground">
          Retries{" "}
          <span className="font-mono tabular-nums text-foreground">
            {retryCount}
          </span>
        </div>
      </div>

      <ol className="relative">
        {events.map((event, idx) => {
          const prev = idx > 0 ? events[idx - 1] : null;
          const isLast = idx === events.length - 1;
          const isRetryBoundary = event.status === "retried" && prev != null;
          const retryNumber = retryNumberByIndex[idx];

          const eventMs = new Date(event.timestamp).getTime();
          const sincePrevMs =
            prev != null
              ? eventMs - new Date(prev.timestamp).getTime()
              : null;

          // Only the latest event pulses — and only while it represents an
          // active state. Past events are static, even if they were once
          // pending/running/retried.
          const isActiveTip = isLast && lastActive;
          const elapsedMs = isActiveTip ? now - eventMs : null;
          const pulsing = isActiveTip;

          return (
            <li key={`${event.timestamp}-${idx}`} className="relative pl-7">
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[11px] top-4 bottom-0 w-px bg-border"
                />
              )}

              <span
                aria-hidden
                className="absolute left-[6px] top-[6px] flex h-3 w-3 items-center justify-center"
              >
                {pulsing && (
                  <span
                    className={cn(
                      "absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping",
                      dotColorClass(event.status),
                    )}
                  />
                )}
                <span
                  className={cn(
                    "relative inline-flex h-3 w-3 rounded-full ring-2 ring-background",
                    dotColorClass(event.status),
                  )}
                />
              </span>

              <div className="flex flex-col gap-1 pb-8">
                <div className="flex flex-wrap items-baseline gap-2">
                  <Badge
                    variant={statusVariant(event.status)}
                    className="capitalize"
                  >
                    {event.status}
                  </Badge>
                  {isRetryBoundary && (
                    <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Retry #{retryNumber}
                    </span>
                  )}
                  <time
                    dateTime={event.timestamp}
                    title={new Date(event.timestamp).toLocaleString()}
                    className="font-mono text-xs tabular-nums text-muted-foreground"
                  >
                    {formatDateTime(event.timestamp)}
                  </time>
                </div>

                {sincePrevMs != null &&
                  (() => {
                    const label = transitionLabel(prev!.status, sincePrevMs);
                    return label != null ? (
                      <p className="text-xs text-muted-foreground">{label}</p>
                    ) : null;
                  })()}

                {elapsedMs != null && (
                  <p className="text-xs text-muted-foreground">
                    elapsed{" "}
                    <span className="font-mono tabular-nums text-foreground">
                      {formatDuration(elapsedMs)}
                    </span>
                  </p>
                )}

                {event.error && (
                  <pre className="mt-1 max-w-prose whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                    {event.error}
                  </pre>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
