"use client";

import { useEffect, useState } from "react";
import { Coins, Loader2, Play, TriangleAlert } from "lucide-react";
import {
  useApiClient,
  type CreateSimulationRequest,
  type CreateSimulationResponse,
  type EstimateSimulationResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
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

type ApiError = {
  response?: { status?: number; data?: { detail?: unknown } };
  message?: string;
};

export type RunSimulationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: CreateSimulationRequest | null;
  motorName?: string;
  onCreated: (response: CreateSimulationResponse) => void;
};

export function RunSimulationDialog({
  open,
  onOpenChange,
  request,
  motorName,
  onCreated,
}: RunSimulationDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent>
        {open && request && (
          <RunSimulationDialogBody
            request={request}
            motorName={motorName}
            submitting={submitting}
            setSubmitting={setSubmitting}
            onCreated={(res) => {
              setSubmitting(false);
              onCreated(res);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RunSimulationDialogBody({
  request,
  motorName,
  submitting,
  setSubmitting,
  onCreated,
}: {
  request: CreateSimulationRequest;
  motorName?: string;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onCreated: (res: CreateSimulationResponse) => void;
}) {
  const api = useApiClient();
  const [estimate, setEstimate] = useState<EstimateSimulationResponse | null>(
    null,
  );
  const [estimating, setEstimating] = useState(true);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .estimateSimulation(request)
      .then((e) => {
        if (!cancelled) {
          setEstimate(e);
          setEstimating(false);
        }
      })
      .catch((e: ApiError) => {
        if (cancelled) return;
        setEstimateError(detailMessage(e) ?? "Could not estimate cost.");
        setEstimating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, request]);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.createSimulation(request);
      onCreated(res);
    } catch (e) {
      setSubmitError(submitErrorMessage(e as ApiError, estimate));
      setSubmitting(false);
    }
  }

  const canAfford = estimate?.can_afford ?? false;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Run simulation?</DialogTitle>
        <DialogDescription>
          {motorName ? (
            <>
              Submit a simulation for{" "}
              <span className="font-medium text-foreground">{motorName}</span>.
              Tokens are charged up front and reconciled when the run completes.
            </>
          ) : (
            "Tokens are charged up front and reconciled when the run completes."
          )}
        </DialogDescription>
      </DialogHeader>

      {estimating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Estimating cost…
        </div>
      )}

      {estimateError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {estimateError}
        </p>
      )}

      {estimate && (
        <div className="space-y-3 rounded-md border bg-muted/30 p-3">
          <Row
            label="Estimated cost"
            value={
              <span className="inline-flex items-center gap-1 font-semibold text-foreground tabular-nums">
                <Coins className="h-3.5 w-3.5" />
                {estimate.estimated_tokens.toLocaleString()} tokens
              </span>
            }
          />
          <Row
            label="Used this period"
            value={
              <span className="tabular-nums text-foreground">
                {estimate.credits.tokens_used.toLocaleString()} tokens
              </span>
            }
          />
          <Row
            label="Remaining this period"
            value={
              <span className="tabular-nums text-foreground">
                {estimate.credits.tokens_remaining == null
                  ? "Unlimited"
                  : `${estimate.credits.tokens_remaining.toLocaleString()} tokens`}
              </span>
            }
          />
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              Estimate is a heuristic. Final cost may be lower (refund) or
              slightly higher and is settled when the run completes.
            </p>
            <AboutCreditsLink className="shrink-0" />
          </div>

          {!canAfford && estimate.credits.tokens_remaining != null && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">Not enough tokens.</p>
                <p className="text-xs">
                  You need{" "}
                  {(
                    estimate.estimated_tokens - estimate.credits.tokens_remaining
                  ).toLocaleString()}{" "}
                  more tokens. Your monthly limit resets on the 1st.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {submitError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" type="button" disabled={submitting}>
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || estimating || !estimate || !canAfford}
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {submitting ? "Starting…" : "Run simulation"}
        </Button>
      </DialogFooter>
    </>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function detailMessage(e: ApiError): string | null {
  const detail = e.response?.data?.detail;
  if (typeof detail === "string" && detail.length > 0) return detail;
  if (typeof e.message === "string" && e.message.length > 0) return e.message;
  return null;
}

function submitErrorMessage(
  e: ApiError,
  estimate: EstimateSimulationResponse | null,
): string {
  const status = e.response?.status;
  const detail = detailMessage(e);
  if (status === 402) {
    if (estimate && estimate.credits.tokens_remaining != null) {
      return `Not enough tokens. ${estimate.credits.tokens_remaining.toLocaleString()} remaining this period; this run needs ${estimate.estimated_tokens.toLocaleString()}.`;
    }
    return detail ?? "Not enough tokens to run this simulation.";
  }
  if (status === 409) {
    return (
      detail ??
      "Simulation limit reached. Delete an existing simulation before creating another."
    );
  }
  if (status === 404) {
    return detail ?? "Motor not found.";
  }
  return detail ?? "Failed to start simulation.";
}
