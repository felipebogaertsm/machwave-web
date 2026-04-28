"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useApiClient,
  type MotorRecord,
  type SimulationDetails,
} from "@/lib/api";
import { useStatusPoller } from "@/components/simulation/useStatusPoller";
import { SolidSimulationView } from "@/components/simulation/solid/SolidSimulationView";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileJson, Trash2 } from "lucide-react";

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
  const [details, setDetails] = useState<SimulationDetails | null>(null);
  const [motorDetail, setMotorDetail] = useState<MotorRecord | null>(null);
  const [motorDetailError, setMotorDetailError] = useState(false);
  const [payloadCopied, setPayloadCopied] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  // Fetch results once simulation is done
  useEffect(() => {
    if (status?.status === "done" && !details && !fetchingRef.current) {
      fetchingRef.current = true;
      api
        .getSimulationResults(simId)
        .then(setDetails)
        .catch(() => {
          fetchingRef.current = false;
        });
    }
  }, [status?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch motor detail using motor_id from successful results
  useEffect(() => {
    if (!details?.motor_id || motorDetail || motorDetailError) return;
    api
      .getMotor(details.motor_id)
      .then(setMotorDetail)
      .catch(() => setMotorDetailError(true));
  }, [details?.motor_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch motor detail via listSimulations on failure (no details payload available)
  useEffect(() => {
    if (status?.status !== "failed" || motorDetail || motorDetailError) return;
    api
      .listSimulations()
      .then((sims) => {
        const sim = sims.find((s) => s.simulation_id === simId);
        if (!sim) throw new Error("Simulation not found");
        return api.getMotor(sim.motor_id);
      })
      .then(setMotorDetail)
      .catch(() => setMotorDetailError(true));
  }, [status?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function writeToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
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

  function handleExportJson() {
    if (!details) return;
    const blob = new Blob([JSON.stringify(details, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulation_${simId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Simulation</h1>
            <p className="font-mono text-xs text-muted-foreground">{simId}</p>
            {motorDetail ? (
              <p className="text-sm text-muted-foreground">
                Motor:{" "}
                <Link
                  href={`/motors/${motorDetail.motor_id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {motorDetail.name}
                </Link>
              </p>
            ) : details?.motor_id ? (
              <p className="text-sm text-muted-foreground">
                Motor:{" "}
                <Link
                  href={`/motors/${details.motor_id}`}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {details.motor_id}
                </Link>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {status && (
              <Badge variant={statusVariant(status.status)} className="text-sm">
                {status.status}
              </Badge>
            )}
            <Button
              variant="outline"
              size="icon"
              title="Export simulation as JSON"
              aria-label="Export simulation as JSON"
              onClick={handleExportJson}
              disabled={!details}
            >
              <FileJson className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              title="Delete simulation"
              aria-label="Delete simulation"
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
                  <p className="self-center text-xs text-muted-foreground">
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

        {/* Results — narrow on motor_type so each variant renders its own view */}
        {details && details.results.motor_type === "solid" && (
          <SolidSimulationView
            results={details.results}
            params={details.params}
          />
        )}
      </div>
    </AppLayout>
  );
}
