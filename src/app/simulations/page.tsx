"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useApiClient,
  type MotorSummary,
  type SimulationSummary,
} from "@/lib/api";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Loader2, Trash2 } from "lucide-react";

type SortKey = "motor_name" | "status" | "created_at" | "updated_at";
type SortDir = "asc" | "desc";

function statusVariant(
  status: SimulationSummary["status"],
): "default" | "secondary" | "success" | "destructive" | "warning" {
  switch (status) {
    case "done":
      return "success";
    case "failed":
      return "destructive";
    case "running":
      return "warning";
    default:
      return "secondary";
  }
}

export default function SimulationsPage() {
  return (
    <ProtectedRoute>
      <SimulationsContent />
    </ProtectedRoute>
  );
}

function SimulationsContent() {
  const api = useApiClient();
  const router = useRouter();
  const [sims, setSims] = useState<SimulationSummary[]>([]);
  const [motorIndex, setMotorIndex] = useState<Record<string, MotorSummary>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(simId: string) {
    if (!confirm("Delete this simulation? This cannot be undone.")) return;
    setDeletingId(simId);
    setError(null);
    try {
      await api.deleteSimulation(simId);
      setSims((prev) => prev.filter((s) => s.simulation_id !== simId));
    } catch {
      setError("Failed to delete simulation.");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    Promise.all([api.listSimulations(), api.listMotors()])
      .then(([s, m]) => {
        setSims(s);
        const idx: Record<string, MotorSummary> = {};
        for (const motor of m) idx[motor.motor_id] = motor;
        setMotorIndex(idx);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "motor_name" || key === "status" ? "asc" : "desc");
    }
  }

  const sorted = [...sims].sort((a, b) => {
    let av: string;
    let bv: string;
    if (sortKey === "motor_name") {
      av = motorIndex[a.motor_id]?.name ?? a.motor_id;
      bv = motorIndex[b.motor_id]?.name ?? b.motor_id;
    } else {
      av = a[sortKey];
      bv = b[sortKey];
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold tracking-tight">simulations</h1>
            {!loading && (
              <span className="text-sm text-muted-foreground">
                ({sims.length})
              </span>
            )}
          </div>
        </div>

        {loading && (
          <Card>
            <CardContent className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 w-full animate-pulse rounded bg-muted"
                />
              ))}
            </CardContent>
          </Card>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && sims.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <p className="text-sm text-muted-foreground">
                No simulations yet. Open a motor and run one.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && sims.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                      <SortHeader
                        label="Motor"
                        sortKey="motor_name"
                        active={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="left"
                      />
                      <SortHeader
                        label="Status"
                        sortKey="status"
                        active={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="left"
                      />
                      <SortHeader
                        label="Created"
                        sortKey="created_at"
                        active={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="right"
                      />
                      <SortHeader
                        label="Updated"
                        sortKey="updated_at"
                        active={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="right"
                      />
                      <th className="w-px px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((sim) => {
                      const motor = motorIndex[sim.motor_id];
                      return (
                        <tr
                          key={sim.simulation_id}
                          onClick={() =>
                            router.push(`/simulations/${sim.simulation_id}`)
                          }
                          className="cursor-pointer border-b last:border-0 transition-colors hover:bg-accent/40"
                        >
                          <td className="px-3 py-3">
                            {motor ? (
                              <Link
                                href={`/motors/${motor.motor_id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-primary hover:underline"
                              >
                                {motor.name}
                              </Link>
                            ) : (
                              <span className="font-mono text-xs text-muted-foreground">
                                {sim.motor_id}
                              </span>
                            )}
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {sim.simulation_id}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant={statusVariant(sim.status)}>
                              {sim.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">
                            {new Date(sim.created_at).toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">
                            {new Date(sim.updated_at).toLocaleString()}
                          </td>
                          <td
                            className="px-3 py-2 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              aria-label="Delete simulation"
                              title="Delete"
                              disabled={deletingId === sim.simulation_id}
                              onClick={() => handleDelete(sim.simulation_id)}
                            >
                              {deletingId === sim.simulation_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onClick,
  align,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
  align: "left" | "right";
}) {
  const isActive = active === sortKey;
  return (
    <th
      className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${
          isActive ? "text-foreground" : ""
        }`}
      >
        {label}
        {isActive && <span aria-hidden>{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
