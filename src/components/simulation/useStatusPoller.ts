"use client";

import { useEffect, useRef, useState } from "react";
import { useApiClient, type SimulationStatusRecord } from "@/lib/api";

const POLL_INTERVAL_MS = 2000;

export function useStatusPoller(simId: string) {
  const api = useApiClient();
  const [status, setStatus] = useState<SimulationStatusRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const record = await api.getSimulationStatus(simId);
        if (cancelled) return;
        setStatus(record);

        // Stop polling when terminal state is reached
        if (record.status === "done" || record.status === "failed") {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (err: unknown) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Polling error");
      }
    }

    // Immediate first fetch
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [simId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { status, error };
}
