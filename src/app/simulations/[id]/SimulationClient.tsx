"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  useApiClient,
  isTerminalSimulationStatus,
  type MotorRecord,
  type SimulationCostRecord,
  type SimulationDetails,
  type SimulationStatus,
} from "@/lib/api";
import { useStatusPoller } from "@/components/simulation/useStatusPoller";
import { useActiveSimulation } from "@/components/simulation/useActiveSimulation";
import { SimulationTimeline } from "@/components/simulation/SimulationTimeline";
import { SolidSimulationView } from "@/components/simulation/solid/SolidSimulationView";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AboutCreditsLink } from "@/components/usage/AboutCreditsLink";
import { cn } from "@/lib/utils";
import {
  Coins,
  FileJson,
  History,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";

function statusVariant(
  status: SimulationStatus,
): "default" | "secondary" | "success" | "destructive" | "warning" | "info" {
  switch (status) {
    case "done":
      return "success";
    case "failed":
      return "destructive";
    case "running":
      return "warning";
    case "retried":
      return "info";
    case "pending":
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
  const { status, error: pollError, revalidate } = useStatusPoller(simId);
  const { activeSim, refresh: refreshActiveSim } = useActiveSimulation();
  const [details, setDetails] = useState<SimulationDetails | null>(null);
  const [motorDetail, setMotorDetail] = useState<MotorRecord | null>(null);
  const [motorDetailError, setMotorDetailError] = useState(false);
  const [payloadCopied, setPayloadCopied] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [cost, setCost] = useState<SimulationCostRecord | null>(null);
  const [costOpen, setCostOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retryConfirmOpen, setRetryConfirmOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const fetchingRef = useRef(false);
  const costFetchedRef = useRef(false);

  const latestStatus: SimulationStatus | undefined = status?.status;
  const isTerminal =
    latestStatus != null && isTerminalSimulationStatus(latestStatus);

  // Fetch results once simulation is done
  useEffect(() => {
    if (latestStatus === "done" && !details && !fetchingRef.current) {
      fetchingRef.current = true;
      api
        .getSimulationResults(simId)
        .then(setDetails)
        .catch(() => {
          fetchingRef.current = false;
        });
    }
  }, [latestStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch cost record once the run is complete (or failed — refunds are visible)
  useEffect(() => {
    if (
      (latestStatus === "done" || latestStatus === "failed") &&
      !cost &&
      !costFetchedRef.current
    ) {
      costFetchedRef.current = true;
      api
        .getSimulationCost(simId)
        .then(setCost)
        .catch(() => {
          costFetchedRef.current = false;
        });
    }
  }, [latestStatus]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (latestStatus !== "failed" || motorDetail || motorDetailError) return;
    api
      .listSimulations()
      .then((sims) => {
        const sim = sims.find((s) => s.simulation_id === simId);
        if (!sim) throw new Error("Simulation not found");
        return api.getMotor(sim.motor_id);
      })
      .then(setMotorDetail)
      .catch(() => setMotorDetailError(true));
  }, [latestStatus]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteSimulation(simId);
      router.replace("/dashboard");
    } catch {
      setDeleteError("Failed to delete simulation");
      setDeleting(false);
    }
  }

  async function handleRetry() {
    if (!status || retrying) return;
    setRetryError(null);
    setRetrying(true);

    try {
      // POST first so the server commits the `retried` event before we
      // re-poll. Doing it the other way around (optimistic-then-POST) racy
      // — a poll could fire between the optimistic update and the server
      // commit and clobber local state with the still-`done` trail.
      await api.retrySimulation(simId);

      // Drop cached results/cost so the new run's data is fetched fresh
      // once it lands.
      setDetails(null);
      setCost(null);
      fetchingRef.current = false;
      costFetchedRef.current = false;

      // Pull the new state immediately (the trail now ends with `retried`).
      revalidate();
      refreshActiveSim();
      setRetryConfirmOpen(false);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const code = err.response?.status;
        if (code === 402) {
          setRetryError("Not enough credits to retry this simulation.");
        } else if (code === 409) {
          setRetryError(
            "Another simulation is currently active. Wait for it to finish.",
          );
        } else if (code === 404) {
          setRetryError("This simulation no longer exists.");
        } else {
          setRetryError("Failed to retry simulation.");
        }
      } else {
        setRetryError("Failed to retry simulation.");
      }
    } finally {
      setRetrying(false);
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">
              {simulationKindLabel(
                motorDetail?.config.motor_type ?? details?.results.motor_type,
              )}
            </h1>
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
              title="Status timeline"
              aria-label="Open status timeline"
              onClick={() => setTimelineOpen(true)}
              disabled={!status || status.events.length === 0}
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              title={
                isTerminal
                  ? activeSim && activeSim.simulation_id !== simId
                    ? "Another simulation is currently active"
                    : "Retry this simulation"
                  : "Retry available once the run completes"
              }
              aria-label="Retry simulation"
              onClick={() => {
                setRetryError(null);
                setRetryConfirmOpen(true);
              }}
              disabled={
                !isTerminal ||
                retrying ||
                (activeSim != null && activeSim.simulation_id !== simId)
              }
            >
              {retrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
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
              variant="outline"
              size="icon"
              title={cost ? "Token cost" : "Token cost (available once the run completes)"}
              aria-label="Show token cost"
              onClick={() => setCostOpen(true)}
              disabled={!cost}
            >
              <Coins className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              title="Delete simulation"
              aria-label="Delete simulation"
              onClick={() => {
                setDeleteError(null);
                setDeleteOpen(true);
              }}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {pollError && (
          <p className="text-sm text-destructive">Polling error: {pollError}</p>
        )}
        {deleteError && (
          <p className="text-sm text-destructive">{deleteError}</p>
        )}


        {/* Inline timeline. Anytime the run isn't `done`, the page has no
            results to show, so we let the trail fill the space. The Timeline
            modal still works for `done` runs (and for a focused view here). */}
        {status &&
          status.events.length > 0 &&
          latestStatus !== "done" && (
            <Card
              className={
                latestStatus === "failed" ? "border-destructive" : undefined
              }
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <CardTitle
                  className={cn(
                    "text-base flex items-center gap-2",
                    latestStatus === "failed" && "text-destructive",
                  )}
                >
                  <History className="h-4 w-4" />
                  {latestStatus === "failed"
                    ? "Simulation Failed"
                    : "Status timeline"}
                </CardTitle>
                {latestStatus === "failed" && (
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
                )}
              </CardHeader>
              <CardContent>
                <SimulationTimeline events={status.events} />
              </CardContent>
            </Card>
          )}

        {/* Brief gap between status flipping to "done" and the results
            payload arriving — show a spinner so the page isn't blank. */}
        {status?.status === "done" && !details && (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Loading results…</p>
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

        <Dialog
          open={retryConfirmOpen}
          onOpenChange={(open) => {
            if (retrying) return;
            setRetryConfirmOpen(open);
            if (!open) setRetryError(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry simulation?
              </DialogTitle>
              <DialogDescription>
                Queue a fresh run for this simulation. Tokens will be charged
                again — failed runs were refunded; done runs already paid for
                prior work; both are charged again on retry. The previous
                results will be replaced once the new run completes.
              </DialogDescription>
            </DialogHeader>

            {retryError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {retryError}
              </p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={retrying}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
              >
                {retrying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {retrying ? "Retrying…" : "Retry"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Status timeline
              </DialogTitle>
              <DialogDescription>
                Append-only event trail for this simulation.
              </DialogDescription>
            </DialogHeader>
            {status && status.events.length > 0 ? (
              <div className="-mx-1 mt-3 max-h-[70vh] overflow-y-auto px-1 pt-2">
                <SimulationTimeline events={status.events} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            )}
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            if (!deleting) {
              setDeleteOpen(open);
              if (!open) setDeleteError(null);
            }
          }}
          onConfirm={handleDelete}
          title="Delete simulation?"
          description="Permanently delete this simulation. This cannot be undone."
          confirmLabel="Delete"
          runningLabel="Deleting..."
          destructive
          running={deleting}
          error={deleteError}
        />

        <TokenCostModal
          open={costOpen}
          onOpenChange={setCostOpen}
          cost={cost}
          failed={status?.status === "failed"}
        />
      </div>
    </AppLayout>
  );
}

function simulationKindLabel(motorType: string | undefined): string {
  if (motorType === "solid") return "Solid Simulation";
  if (motorType === "liquid") return "Liquid Simulation";
  if (motorType === "hybrid") return "Hybrid Simulation";
  return "Simulation";
}

function TokenCostModal({
  open,
  onOpenChange,
  cost,
  failed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cost: SimulationCostRecord | null;
  failed: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Token cost
          </DialogTitle>
          <DialogDescription>
            What this run consumed against your monthly token allowance.
          </DialogDescription>
        </DialogHeader>

        {!cost ? (
          <p className="text-sm text-muted-foreground">
            The cost record is created when the run completes.
          </p>
        ) : (
          <CostBody cost={cost} failed={failed} />
        )}

        <div className="flex justify-end pt-1">
          <AboutCreditsLink />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CostBody({
  cost,
  failed,
}: {
  cost: SimulationCostRecord;
  failed: boolean;
}) {
  const settled = cost.actual_tokens != null;
  const delta =
    cost.actual_tokens != null
      ? cost.actual_tokens - cost.estimated_tokens
      : null;
  return (
    <div className="space-y-3 text-sm">
      {cost.refunded && (
        <span className="inline-block rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400">
          Refunded
        </span>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          label="Estimated"
          value={`${cost.estimated_tokens.toLocaleString()} tokens`}
        />
        <Metric
          label="Actual"
          value={
            settled ? `${cost.actual_tokens!.toLocaleString()} tokens` : "—"
          }
          sub={
            delta != null ? (
              <span
                className={
                  delta === 0
                    ? "text-muted-foreground"
                    : delta < 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                }
              >
                {delta > 0 ? "+" : ""}
                {delta.toLocaleString()} vs estimate
              </span>
            ) : null
          }
        />
        <Metric
          label="Iterations"
          value={
            cost.iterations != null ? cost.iterations.toLocaleString() : "—"
          }
        />
        <Metric
          label="Period"
          value={<span className="font-mono">{cost.period}</span>}
        />
      </div>
      <div className="grid grid-cols-1 border-t pt-3">
        <Metric
          label="Tokens charged"
          value={`${cost.tokens_charged.toLocaleString()} tokens`}
        />
      </div>
      {failed && !cost.refunded && (
        <p className="text-xs text-muted-foreground">
          The run failed. The pre-charge will be refunded automatically.
        </p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-medium tabular-nums">{value}</p>
      {sub && <p className="text-[11px]">{sub}</p>}
    </div>
  );
}
