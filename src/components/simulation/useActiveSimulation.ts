"use client";

import { useEffect, useState } from "react";
import { useApiClient, type SimulationSummary } from "@/lib/api";

// Backend rejects new dispatches while the user has any pending/running sim.
// Surface that to the UI so we can disable Run buttons before the round-trip.
export function useActiveSimulation() {
  const api = useApiClient();
  const [activeSim, setActiveSim] = useState<SimulationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .listSimulations()
      .then((sims) => {
        if (cancelled) return;
        const active =
          sims.find((s) => s.status === "running") ??
          sims.find((s) => s.status === "pending") ??
          null;
        setActiveSim(active);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setActiveSim(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, refreshTick]);

  const refresh = () => setRefreshTick((n) => n + 1);

  return { activeSim, loading, refresh };
}
