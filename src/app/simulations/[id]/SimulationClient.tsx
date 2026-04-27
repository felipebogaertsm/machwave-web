"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useApiClient,
  type MotorDetail,
  type SimulationDetails,
} from "@/lib/api";
import { useStatusPoller } from "@/components/simulation/useStatusPoller";
import { SimulationResultsChart } from "@/components/simulation/SimulationResultsChart";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileJson, Trash2 } from "lucide-react";
import { fractionToPercent, paToMpa } from "@/lib/units";

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

function formatMetric(value: number): string {
  if (value === 0) return "0";
  const abs = Math.abs(value);
  let digits: number;
  if (abs >= 1000) digits = 0;
  else if (abs >= 100) digits = 1;
  else if (abs >= 10) digits = 2;
  else if (abs >= 1) digits = 3;
  else if (abs >= 0.01) digits = 4;
  else digits = 6;
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
    useGrouping: true,
  });
}

function StatGroup({
  title,
  children,
  columnsClassName = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  className,
}: {
  title: string;
  children: ReactNode;
  columnsClassName?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className={`grid gap-x-6 gap-y-2 text-sm ${columnsClassName}`}>
          {children}
        </dl>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/50 py-1">
      <dt className="truncate text-muted-foreground">{label}</dt>
      <dd className="tabular-nums font-medium">
        {typeof value === "number" ? formatMetric(value) : value}
        {unit ? (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </dd>
    </div>
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
  const [details, setDetails] = useState<SimulationDetails | null>(null);
  const [motorDetail, setMotorDetail] = useState<MotorDetail | null>(null);
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

        {/* Results */}
        {details && (
          <>
            {/* Chart + Performance side-by-side on xl */}
            <div className="grid gap-6 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardContent className="pt-6">
                  <SimulationResultsChart results={details.results} />
                </CardContent>
              </Card>

              <StatGroup
                title="Performance"
                columnsClassName="grid-cols-2 sm:grid-cols-3 xl:grid-cols-1"
              >
                <Stat
                  label="Total Impulse"
                  value={details.results.total_impulse}
                  unit="N·s"
                />
                <Stat
                  label="Specific Impulse"
                  value={details.results.specific_impulse}
                  unit="s"
                />
                <Stat
                  label="Max Thrust"
                  value={details.results.max_thrust}
                  unit="N"
                />
                <Stat
                  label="Avg Thrust"
                  value={details.results.avg_thrust}
                  unit="N"
                />
                <Stat
                  label="Thrust Time"
                  value={details.results.thrust_time}
                  unit="s"
                />
                <Stat
                  label="Burn Time"
                  value={details.results.burn_time}
                  unit="s"
                />
                <Stat
                  label="Initial Propellant Mass"
                  value={details.results.initial_propellant_mass}
                  unit="kg"
                />
                <Stat
                  label="Burn Profile"
                  value={details.results.burn_profile}
                />
              </StatGroup>
            </div>

            <StatGroup title="Pressure & Efficiency">
              <Stat
                label="Max Chamber P"
                value={paToMpa(details.results.max_chamber_pressure)}
                unit="MPa"
              />
              <Stat
                label="Avg Chamber P"
                value={paToMpa(details.results.avg_chamber_pressure)}
                unit="MPa"
              />
              <Stat
                label="Avg Nozzle Eff."
                value={fractionToPercent(
                  details.results.avg_nozzle_efficiency,
                )}
                unit="%"
              />
              <Stat
                label="Avg Overall Eff."
                value={fractionToPercent(
                  details.results.avg_overall_efficiency,
                )}
                unit="%"
              />
              <Stat
                label="Volumetric Eff."
                value={fractionToPercent(details.results.volumetric_efficiency)}
                unit="%"
              />
              <Stat
                label="Max Mass Flux"
                value={details.results.max_mass_flux}
                unit="kg/(s·m²)"
              />
            </StatGroup>

            <StatGroup title="Klemmung (Kn)">
              <Stat label="Mean Kn" value={details.results.mean_klemmung} />
              <Stat label="Max Kn" value={details.results.max_klemmung} />
              <Stat
                label="Initial / Final Kn"
                value={details.results.initial_to_final_klemmung_ratio}
              />
            </StatGroup>

            <StatGroup title="Simulation Parameters">
              {details.params.d_t !== undefined && (
                <Stat label="Time Step" value={details.params.d_t} unit="s" />
              )}
              {details.params.igniter_pressure !== undefined && (
                <Stat
                  label="Igniter P"
                  value={paToMpa(details.params.igniter_pressure)}
                  unit="MPa"
                />
              )}
              {details.params.external_pressure !== undefined && (
                <Stat
                  label="External P"
                  value={paToMpa(details.params.external_pressure)}
                  unit="MPa"
                />
              )}
              {details.params.other_losses !== undefined && (
                <Stat
                  label="Other Losses"
                  value={details.params.other_losses}
                  unit="%"
                />
              )}
            </StatGroup>
          </>
        )}
      </div>
    </AppLayout>
  );
}
