"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Trash2 } from "lucide-react";
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
  const router = useRouter();
  const simId = params.id as string;
  const api = useApiClient();
  const { status, error: pollError } = useStatusPoller(simId);
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [motorDetail, setMotorDetail] = useState<MotorDetail | null>(null);
  const [motorDetailError, setMotorDetailError] = useState(false);
  const [payloadCopied, setPayloadCopied] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

  // Fetch motor detail once simulation fails so copy buttons have data
  useEffect(() => {
    if (status?.status === "failed" && !motorDetail && !motorDetailError) {
      api
        .listSimulations()
        .then((sims) => {
          const sim = sims.find((s) => s.simulation_id === simId);
          if (!sim) throw new Error("Simulation not found");
          return api.getMotor(sim.motor_id);
        })
        .then(setMotorDetail)
        .catch((err) => {
          console.error("[SimulationClient] failed to load motor detail:", err);
          setMotorDetailError(true);
        });
    }
  }, [status?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function writeToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback: create a temporary textarea and use execCommand
      const el = document.createElement("textarea");
      el.value = text;
      el.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  }

  async function handleCopyPayload() {
    if (!motorDetail) return;
    await writeToClipboard(JSON.stringify(motorDetail.config, null, 2));
    setPayloadCopied(true);
    setTimeout(() => setPayloadCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirm("Delete this simulation? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.deleteSimulation(simId);
      router.replace("/dashboard");
    } catch {
      setDeleteError("Failed to delete simulation");
      setDeleting(false);
    }
  }

  async function handleCopyErrorReport() {
    if (!motorDetail || !status) return;
    const lines = [
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
    ];
    await writeToClipboard(lines.join("\n"));
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 2000);
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Simulation</h1>
            <p className="font-mono text-xs text-muted-foreground">{simId}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {status && (
              <Badge variant={statusVariant(status.status)} className="text-sm">
                {status.status}
              </Badge>
            )}
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {pollError && (
          <p className="text-sm text-destructive">Polling error: {pollError}</p>
        )}
        {deleteError && (
          <p className="text-sm text-destructive">{deleteError}</p>
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
                {motorDetailError && (
                  <p className="text-xs text-muted-foreground self-center">
                    Could not load motor data
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!motorDetail}
                  onClick={handleCopyPayload}
                >
                  {payloadCopied ? "Copied!" : "Copy Motor Payload"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!motorDetail}
                  onClick={handleCopyErrorReport}
                >
                  {reportCopied ? "Copied!" : "Copy Error Report"}
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
