"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  useApiClient,
  type TeamAccountSnapshot,
  type TeamSummary,
} from "@/lib/api";
import { apiErrorDetail, apiErrorStatus } from "@/lib/api-errors";
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

// Three-way return:
//   - "" → leave field unchanged (omit from request)
//   - non-empty digit string → number
//   - "unlimited" → null (clear cap, treat as ∞)
//   - "invalid" → reject
type ParsedLimit = "invalid" | "unchanged" | "unlimited" | number;

function parseLimit(raw: string): ParsedLimit {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "") return "unchanged";
  if (trimmed === "∞" || trimmed === "unlimited" || trimmed === "null")
    return "unlimited";
  if (!/^\d+$/.test(trimmed)) return "invalid";
  return Number.parseInt(trimmed, 10);
}

function toRequestField(parsed: ParsedLimit): number | null | undefined {
  if (parsed === "unchanged") return undefined;
  if (parsed === "unlimited") return null;
  if (parsed === "invalid") return undefined; // caller rejects upstream
  return parsed;
}

export function TeamAccountDialog({
  team,
  open,
  onOpenChange,
  onSaved,
}: {
  team: TeamSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Called once a successful update lands so the parent table can refresh.
  onSaved?: (snapshot: TeamAccountSnapshot) => void;
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
        {open && team ? (
          <TeamAccountDialogBody
            team={team}
            onBusyChange={setBusy}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TeamAccountDialogBody({
  team,
  onBusyChange,
  onSaved,
}: {
  team: TeamSummary;
  onBusyChange: (busy: boolean) => void;
  onSaved?: (snapshot: TeamAccountSnapshot) => void;
}) {
  const api = useApiClient();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ok"; account: TeamAccountSnapshot }
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
      .getTeamAccount(team.team_id)
      .then((a) => {
        if (!cancelled) setState({ kind: "ok", account: a });
      })
      .catch((e) => {
        if (cancelled) return;
        // Admins aren't team members; if the backend gates /teams/{tid}/account
        // strictly on viewer+, this 403/404s. Fall back to allowing limit
        // updates without showing the current snapshot — the PATCH still
        // works and returns a fresh snapshot.
        const status = apiErrorStatus(e);
        if (status === 403 || status === 404) {
          setState({
            kind: "error",
            message:
              "You aren't a member of this team. Snapshot is unavailable, but you can still set limits.",
          });
        } else {
          setState({
            kind: "error",
            message: apiErrorDetail(e) ?? "Failed to load team account.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, team.team_id]);

  useEffect(() => {
    onBusyChange(savingLimits);
  }, [savingLimits, onBusyChange]);

  async function handleSaveLimits() {
    setLimitsError(null);
    setLimitsNotice(null);

    const motorParsed = parseLimit(motorLimit);
    const simParsed = parseLimit(simLimit);
    const tokenParsed = parseLimit(monthlyLimit);

    if (
      motorParsed === "invalid" ||
      simParsed === "invalid" ||
      tokenParsed === "invalid"
    ) {
      setLimitsError(
        "Limits must be non-negative integers, blank to leave unchanged, or 'unlimited' to clear.",
      );
      return;
    }

    if (
      motorParsed === "unchanged" &&
      simParsed === "unchanged" &&
      tokenParsed === "unchanged"
    ) {
      setLimitsError("Enter at least one value to update.");
      return;
    }

    setSavingLimits(true);
    try {
      const next = await api.adminUpdateTeamLimits(team.team_id, {
        motor_limit: toRequestField(motorParsed),
        simulation_limit: toRequestField(simParsed),
        monthly_token_limit: toRequestField(tokenParsed),
      });
      setState({ kind: "ok", account: next });
      setMotorLimit("");
      setSimLimit("");
      setMonthlyLimit("");
      setLimitsNotice("Limits updated.");
      onSaved?.(next);
    } catch (e) {
      setLimitsError(apiErrorDetail(e) ?? "Failed to update limits.");
    } finally {
      setSavingLimits(false);
    }
  }

  const busy = savingLimits;
  const account = state.kind === "ok" ? state.account : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Team account</DialogTitle>
        <DialogDescription>
          Caps and balances for{" "}
          <span className="font-medium text-foreground">{team.name}</span>.
        </DialogDescription>
      </DialogHeader>

      {state.kind === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading account…
        </div>
      )}

      {state.kind === "error" && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          {state.message}
        </p>
      )}

      {account && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Snapshot
          </span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums">
            <SnapshotRow
              label="Motors"
              value={`${account.motor_count?.toLocaleString() ?? "—"} / ${
                account.motor_limit?.toLocaleString() ?? "∞"
              }`}
            />
            <SnapshotRow
              label="Simulations"
              value={`${
                account.simulation_count?.toLocaleString() ?? "—"
              } / ${account.simulation_limit?.toLocaleString() ?? "∞"}`}
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
      )}

      <FormSection
        title="Update limits"
        description='Override team caps. Leave a field blank to keep its current value, or type "unlimited" to clear.'
        error={limitsError}
        notice={limitsNotice}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FieldLimit
            id="team-motor-limit"
            label="Motor cap"
            placeholder={account?.motor_limit?.toString() ?? "∞"}
            value={motorLimit}
            onChange={setMotorLimit}
            disabled={busy}
          />
          <FieldLimit
            id="team-sim-limit"
            label="Simulation cap"
            placeholder={account?.simulation_limit?.toString() ?? "∞"}
            value={simLimit}
            onChange={setSimLimit}
            disabled={busy}
          />
          <FieldLimit
            id="team-token-limit"
            label="Monthly token limit"
            placeholder={
              account?.credits.monthly_token_limit?.toString() ?? "∞"
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

function FieldLimit({
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
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
