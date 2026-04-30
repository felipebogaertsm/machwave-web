"use client";

import { useEffect, useState } from "react";
import { useApiClient, type SimulationSummary } from "@/lib/api";
import { useScopeTeamId } from "@/lib/team-scope";

// Backend rejects new dispatches while the active pool has any pending/running
// sim. Pools are scoped — a pending team sim doesn't block a personal run and
// vice versa — so we look at sims in the same scope as the caller.
export function useActiveSimulation() {
  const api = useApiClient();
  const teamId = useScopeTeamId();
  const [activeSim, setActiveSim] = useState<SimulationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .listSimulations(teamId)
      .then((sims) => {
        if (cancelled) return;
        const active =
          sims.find((s) => s.status === "running") ??
          sims.find((s) => s.status === "pending") ??
          sims.find((s) => s.status === "retried") ??
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
  }, [api, teamId, refreshTick]);

  const refresh = () => setRefreshTick((n) => n + 1);

  return { activeSim, loading, refresh };
}
