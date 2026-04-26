"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  useApiClient,
  type MotorDetail,
  type SimulationResults,
} from "@/lib/api";
import { useStatusPoller } from "@/components/simulation/useStatusPoller";
import { SimulationResultsChart } from "@/components/simulation/SimulationResultsChart";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { paToMpa } from "@/lib/units";

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
  const [motorDetail, setMotorDetail] = useState<MotorDetail | null>(null);
  const [copied, setCopied] = useState<"payload" | "error" | null>(null);
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

  // Fetch motor detail once simulation fails
  useEffect(() => {
    if (status?.status === "failed" && !motorDetail) {
      api
        .getSimulation(simId)
        .then((sim) => api.getMotor(sim.motor_id))
        .then(setMotorDetail)
        .catch(() => {});
    }
  }, [status?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  }

  async function handleCopyPayload() {
    if (!motorDetail) return;
    try {
      await copyToClipboard(JSON.stringify(motorDetail.config, null, 2));
      setCopied("payload");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  async function handleCopyErrorReport() {
    if (!motorDetail || !status) return;
    const report = [
      "## Simulation Failure Report",
      `Simulation ID: ${simId}`,
      `Motor ID: ${motorDetail.motor_id}`,
      `Motor Name: ${motorDetail.name}`,
      `Status: failed`,
      `Error: ${status.error ?? "Unknown error"}`,
      `Timestamp: ${status.updated_at}`,
      "",
      "## Motor Configuration (JSON)",
      JSON.stringify(motorDetail.config, null, 2),
    ].join("\n");
    try {
      await copyToClipboard(report);
      setCopied("error");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <AppLayout>
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
          <p className="text-sm text-destructive">Polling error: {pollError}</p>
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
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <CardTitle className="text-destructive">
                Simulation Failed
              </CardTitle>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!motorDetail}
                  onClick={handleCopyPayload}
                >
                  {copied === "payload" ? "Copied!" : "Copy Motor Payload"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!motorDetail}
                  onClick={handleCopyErrorReport}
                >
                  {copied === "error" ? "Copied!" : "Copy Error Report"}
                </Button>
              </div>
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
                value={paToMpa(results.max_chamber_pressure)}
                unit="MPa"
              />
              <Card className="sm:col-span-2">
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Burn Profile</p>
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
    </AppLayout>
  );
}
