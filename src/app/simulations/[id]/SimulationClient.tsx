"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useApiClient, type SimulationResults } from "@/lib/api";
import { useStatusPoller } from "@/components/simulation/useStatusPoller";
import { SimulationResultsChart } from "@/components/simulation/SimulationResultsChart";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function statusVariant(
  status: string,
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

function MetricCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">
          {value.toFixed(value < 10 ? 2 : 0)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {unit}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SimulationPage() {
  return (
    <ProtectedRoute>
      <SimulationContent />
    </ProtectedRoute>
  );
}

function SimulationContent() {
  const params = useParams();
  const simId = params.id as string;
  const api = useApiClient();
  const { status, error: pollError } = useStatusPoller(simId);
  const [results, setResults] = useState<SimulationResults | null>(null);
  const fetchingRef = useRef(false);

  // Fetch results once simulation is done
  useEffect(() => {
    if (status?.status === "done" && !results && !fetchingRef.current) {
      fetchingRef.current = true;
      api
        .getSimulationResults(simId)
        .then(setResults)
        .catch(() => {
          fetchingRef.current = false;
        });
    }
  }, [status?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Simulation</h1>
              <p className="font-mono text-xs text-muted-foreground">{simId}</p>
            </div>
            {status && (
              <Badge variant={statusVariant(status.status)} className="text-sm">
                {status.status}
              </Badge>
            )}
          </div>

          {pollError && (
            <p className="text-sm text-destructive">
              Polling error: {pollError}
            </p>
          )}

          {/* Running indicator */}
          {(status?.status === "pending" || status?.status === "running") && (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground">
                  Simulation is {status.status}… results will appear
                  automatically.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {status?.status === "failed" && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">
                  Simulation Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {status.error ?? "Unknown error"}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results && (
            <>
              {/* Scalar metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard
                  label="Total Impulse"
                  value={results.total_impulse}
                  unit="N·s"
                />
                <MetricCard
                  label="Specific Impulse"
                  value={results.specific_impulse}
                  unit="s"
                />
                <MetricCard
                  label="Max Thrust"
                  value={results.max_thrust}
                  unit="N"
                />
                <MetricCard
                  label="Avg Thrust"
                  value={results.avg_thrust}
                  unit="N"
                />
                <MetricCard
                  label="Burn Time"
                  value={results.thrust_time}
                  unit="s"
                />
                <MetricCard
                  label="Max Chamber P"
                  value={results.max_chamber_pressure / 1e6}
                  unit="MPa"
                />
                <Card className="sm:col-span-2">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">
                      Burn Profile
                    </p>
                    <Badge className="mt-1">{results.burn_profile}</Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Time Series</CardTitle>
                </CardHeader>
                <CardContent>
                  <SimulationResultsChart results={results} />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
