"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useApiClient,
  isTerminalSimulationStatus,
  type SimulationStatusRecord,
} from "@/lib/api";

const POLL_INTERVAL_MS = 2000;

export function useStatusPoller(simId: string) {
  const api = useApiClient();
  const [status, setStatus] = useState<SimulationStatusRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped to force the polling effect to re-run — used by callers after a
  // mutation (e.g. POST /retry) so the next fetch picks up the new trail
  // without waiting for the next interval tick.
  const [activationTick, setActivationTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      try {
        const record = await api.getSimulationStatus(simId);
        if (cancelled) return;
        setStatus(record);

        const last = record.events[record.events.length - 1];
        if (last && isTerminalSimulationStatus(last.status)) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (err: unknown) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Polling error");
      }
    }

    poll();
    intervalId = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [simId, activationTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const revalidate = useCallback(() => {
    setActivationTick((n) => n + 1);
  }, []);

  return { status, error, revalidate };
}
