"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiClient, type SimulationSummary } from "@/lib/api";

// Backend rejects new dispatches while the user has any pending/running sim.
// Surface that to the UI so we can disable Run buttons before the round-trip.
export function useActiveSimulation() {
  const api = useApiClient();
  const [activeSim, setActiveSim] = useState<SimulationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    api
      .listSimulations()
      .then((sims) => {
        const active =
          sims.find((s) => s.status === "running") ??
          sims.find((s) => s.status === "pending") ??
          null;
        setActiveSim(active);
      })
      .catch(() => setActiveSim(null))
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { activeSim, loading, refresh };
}
