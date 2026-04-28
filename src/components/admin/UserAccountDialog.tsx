"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  useApiClient,
  type AccountSnapshot,
  type UserSummary,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
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

type ApiError = {
  response?: { data?: { detail?: unknown } };
  message?: string;
};

function detailMessage(e: unknown): string {
  const err = e as ApiError;
  const detail = err.response?.data?.detail;
  if (typeof detail === "string" && detail.length > 0) return detail;
  if (typeof err.message === "string" && err.message.length > 0)
    return err.message;
  return "Something went wrong. Please try again.";
}

function parseOptionalInt(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return "invalid";
  return Number.parseInt(trimmed, 10);
}

export function UserAccountDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        {open && user ? (
          <UserAccountDialogBody user={user} onBusyChange={setBusy} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function UserAccountDialogBody({
  user,
  onBusyChange,
}: {
  user: UserSummary;
  onBusyChange: (busy: boolean) => void;
}) {
  const api = useApiClient();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ok"; account: AccountSnapshot }
  >({ kind: "loading" });

  const [motorLimit, setMotorLimit] = useState("");
  const [simLimit, setSimLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitsError, setLimitsError] = useState<string | null>(null);
  const [limitsNotice, setLimitsNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .adminGetAccount(user.uid)
      .then((a) => {
        if (!cancelled) setState({ kind: "ok", account: a });
      })
      .catch((e) => {
        if (!cancelled)
          setState({ kind: "error", message: detailMessage(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [api, user.uid]);

  useEffect(() => {
    onBusyChange(savingLimits);
  }, [savingLimits, onBusyChange]);

  async function handleSaveLimits() {
    setLimitsError(null);
    setLimitsNotice(null);

    const motorParsed = parseOptionalInt(motorLimit);
    const simParsed = parseOptionalInt(simLimit);
    const tokenParsed = parseOptionalInt(monthlyLimit);

    if (
      motorParsed === "invalid" ||
      simParsed === "invalid" ||
      tokenParsed === "invalid"
    ) {
      setLimitsError("Limits must be non-negative integers.");
      return;
    }

    if (motorParsed === null && simParsed === null && tokenParsed === null) {
      setLimitsError("Enter at least one value to update.");
      return;
    }

    setSavingLimits(true);
    try {
      const next = await api.adminUpdateLimits(user.uid, {
        motor_limit: motorParsed ?? undefined,
        simulation_limit: simParsed ?? undefined,
        monthly_token_limit: tokenParsed ?? undefined,
      });
      setState({ kind: "ok", account: next });
      setMotorLimit("");
      setSimLimit("");
      setMonthlyLimit("");
      setLimitsNotice("Limits updated.");
    } catch (e) {
      setLimitsError(detailMessage(e));
    } finally {
      setSavingLimits(false);
    }
  }

  const busy = savingLimits;
  const target = user.email ?? user.uid;
  const account = state.kind === "ok" ? state.account : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Account</DialogTitle>
        <DialogDescription>
          Caps, balances, and admin overrides for{" "}
          <span className="font-mono text-foreground">{target}</span>.
        </DialogDescription>
      </DialogHeader>

      {state.kind === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading account…
        </div>
      )}

      {state.kind === "error" && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      )}

      {account && (
        <>
          <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Snapshot
              </span>
              {account.is_admin && (
                <Badge variant="default">Admin (unlimited)</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums">
              <SnapshotRow
                label="Motors"
                value={`${account.motor_count?.toLocaleString() ?? "—"} / ${account.motor_limit?.toLocaleString() ?? "∞"}`}
              />
              <SnapshotRow
                label="Simulations"
                value={`${account.simulation_count?.toLocaleString() ?? "—"} / ${account.simulation_limit?.toLocaleString() ?? "∞"}`}
              />
              <SnapshotRow
                label="Monthly token limit"
                value={
                  account.credits.monthly_token_limit == null
                    ? "Unlimited"
                    : `${account.credits.monthly_token_limit.toLocaleString()} tokens`
                }
              />
              <SnapshotRow
                label="Usage period"
                value={
                  <span className="font-mono">
                    {account.credits.usage_period}
                  </span>
                }
              />
              <SnapshotRow
                label="Tokens used"
                value={`${account.credits.tokens_used.toLocaleString()} tokens`}
              />
              <SnapshotRow
                label="Tokens remaining"
                value={
                  account.credits.tokens_remaining == null
                    ? "Unlimited"
                    : `${account.credits.tokens_remaining.toLocaleString()} tokens`
                }
              />
            </div>
          </div>

          <FormSection
            title="Update limits"
            description="Override per-user caps. Leave a field blank to keep its current value."
            error={limitsError}
            notice={limitsNotice}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FieldInt
                id="motor-limit"
                label="Motor cap"
                placeholder={account.motor_limit?.toString() ?? "∞"}
                value={motorLimit}
                onChange={setMotorLimit}
                disabled={busy}
              />
              <FieldInt
                id="sim-limit"
                label="Simulation cap"
                placeholder={account.simulation_limit?.toString() ?? "∞"}
                value={simLimit}
                onChange={setSimLimit}
                disabled={busy}
              />
              <FieldInt
                id="monthly-token-limit"
                label="Monthly token limit"
                placeholder={
                  account.credits.monthly_token_limit?.toString() ?? "∞"
                }
                value={monthlyLimit}
                onChange={setMonthlyLimit}
                disabled={busy}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={handleSaveLimits}
                disabled={busy}
              >
                {savingLimits && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                Save limits
              </Button>
            </div>
          </FormSection>
        </>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" type="button" disabled={busy}>
            Close
          </Button>
        </DialogClose>
      </DialogFooter>
    </>
  );
}

function SnapshotRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </>
  );
}

function FormSection({
  title,
  description,
  error,
  notice,
  children,
}: {
  title: string;
  description?: string;
  error?: string | null;
  notice?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 border-t pt-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          {notice}
        </p>
      )}
    </div>
  );
}

function FieldInt({
  id,
  label,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
