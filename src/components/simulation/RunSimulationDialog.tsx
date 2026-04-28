"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins, Loader2, Play, TriangleAlert } from "lucide-react";
import {
  useApiClient,
  type CreateSimulationRequest,
  type CreateSimulationResponse,
  type EstimateSimulationResponse,
  type IBSimParams,
} from "@/lib/api";
import { toSimParamsApiPayload } from "@/lib/units";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AboutCreditsLink } from "@/components/usage/AboutCreditsLink";
import { cn } from "@/lib/utils";

type ApiError = {
  response?: { status?: number; data?: { detail?: unknown } };
  message?: string;
};

// Parameter limits and defaults. Defaults match the backend's recommended
// values (see src/lib/validations.ts → ibSimParamsSchema). Bounds are the
// engineering ranges we surface to users; values outside these are usually
// either nonsensical or so far from typical that they need explicit thought.
type ParamKey = "d_t" | "igniter_pressure" | "external_pressure" | "other_losses";

interface ParamSpec {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  hint: string;
}

const PARAM_SPECS: Record<ParamKey, ParamSpec> = {
  d_t: {
    label: "Time step",
    unit: "s",
    min: 0.001,
    max: 0.1,
    step: 0.001,
    default: 0.01,
    hint: "Range 0.001–0.1 s. Smaller is more accurate but slower.",
  },
  igniter_pressure: {
    label: "Igniter pressure",
    unit: "MPa",
    min: 0.1,
    max: 10,
    step: 0.05,
    default: 1.0,
    hint: "Typical 0.5–2 MPa. Pressure produced by the igniter at t=0.",
  },
  external_pressure: {
    label: "External pressure",
    unit: "MPa",
    min: 0,
    max: 0.2,
    step: 0.001,
    default: 0.101325,
    hint: "Sea level ≈ 0.101 MPa. Vacuum = 0.",
  },
  other_losses: {
    label: "Other losses",
    unit: "%",
    min: 0,
    max: 30,
    step: 0.5,
    default: 12.0,
    hint: "Typical 5–15%. Combined non-modeled efficiency losses.",
  },
};

type ParamForm = Record<ParamKey, string>;

function defaultForm(initial?: IBSimParams): ParamForm {
  return {
    d_t: String(initial?.d_t ?? PARAM_SPECS.d_t.default),
    igniter_pressure: String(
      initial?.igniter_pressure ?? PARAM_SPECS.igniter_pressure.default,
    ),
    external_pressure: String(
      initial?.external_pressure ?? PARAM_SPECS.external_pressure.default,
    ),
    other_losses: String(
      initial?.other_losses ?? PARAM_SPECS.other_losses.default,
    ),
  };
}

function validateField(key: ParamKey, raw: string): string | null {
  const spec = PARAM_SPECS[key];
  if (raw.trim() === "") return "Required";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "Must be a number";
  if (n < spec.min) return `Min ${spec.min} ${spec.unit}`;
  if (n > spec.max) return `Max ${spec.max} ${spec.unit}`;
  return null;
}

function validateForm(form: ParamForm): {
  errors: Partial<Record<ParamKey, string>>;
  values: IBSimParams | null;
} {
  const errors: Partial<Record<ParamKey, string>> = {};
  (Object.keys(PARAM_SPECS) as ParamKey[]).forEach((k) => {
    const err = validateField(k, form[k]);
    if (err) errors[k] = err;
  });
  if (Object.keys(errors).length > 0) return { errors, values: null };
  return {
    errors,
    values: {
      d_t: Number(form.d_t),
      igniter_pressure: Number(form.igniter_pressure),
      external_pressure: Number(form.external_pressure),
      other_losses: Number(form.other_losses),
    },
  };
}

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
  const [form, setForm] = useState<ParamForm>(() => defaultForm(request.params));
  const [estimate, setEstimate] = useState<EstimateSimulationResponse | null>(
    null,
  );
  const [estimating, setEstimating] = useState(true);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { errors, values } = useMemo(() => validateForm(form), [form]);
  const isValid = values != null;

  function updateField(key: ParamKey, next: string) {
    setForm((f) => ({ ...f, [key]: next }));
    // Eagerly enter the "estimating" state so the spinner shows while we
    // debounce. Doing it here (in an event handler) keeps setState out of
    // the effect body.
    setEstimating(true);
    setEstimateError(null);
  }

  // Re-estimate whenever params validate. Debounced so typing doesn't spam
  // the backend.
  useEffect(() => {
    if (!isValid || !values) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      api
        .estimateSimulation({
          motor_id: request.motor_id,
          params: toSimParamsApiPayload(values),
        })
        .then((e) => {
          if (cancelled) return;
          setEstimate(e);
          setEstimating(false);
        })
        .catch((e: ApiError) => {
          if (cancelled) return;
          setEstimateError(detailMessage(e) ?? "Could not estimate cost.");
          setEstimating(false);
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [api, request.motor_id, values, isValid]);

  async function handleSubmit() {
    if (!values) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.createSimulation({
        motor_id: request.motor_id,
        params: toSimParamsApiPayload(values),
      });
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

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Parameters
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(PARAM_SPECS) as ParamKey[]).map((key) => (
            <ParamField
              key={key}
              paramKey={key}
              spec={PARAM_SPECS[key]}
              value={form[key]}
              error={errors[key] ?? null}
              onChange={(next) => updateField(key, next)}
            />
          ))}
        </div>
      </div>

      {estimating && isValid && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Estimating cost…
        </div>
      )}

      {estimateError && isValid && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {estimateError}
        </p>
      )}

      {estimate && !estimating && isValid && (
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
          disabled={
            submitting || estimating || !estimate || !canAfford || !isValid
          }
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

function ParamField({
  paramKey,
  spec,
  value,
  error,
  onChange,
}: {
  paramKey: ParamKey;
  spec: ParamSpec;
  value: string;
  error: string | null;
  onChange: (next: string) => void;
}) {
  const id = `sim-param-${paramKey}`;
  return (
    <div className="space-y-1">
      <Label
        htmlFor={id}
        className="flex items-baseline justify-between gap-2"
      >
        <span>{spec.label}</span>
        <span className="text-[10px] font-normal text-muted-foreground">
          {spec.unit}
        </span>
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        aria-invalid={error != null}
        onChange={(e) => onChange(e.target.value)}
        className={cn(error != null && "border-destructive")}
      />
      <p
        className={cn(
          "text-[11px]",
          error != null ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {error ?? spec.hint}
      </p>
    </div>
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
