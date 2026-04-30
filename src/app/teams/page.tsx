"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  Plus,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useApiClient, type TeamRole } from "@/lib/api";
import { useTeamScope } from "@/lib/team-scope";
import { apiErrorDetail, apiErrorStatus } from "@/lib/api-errors";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export default function TeamsPage() {
  return (
    <ProtectedRoute>
      <TeamsContent />
    </ProtectedRoute>
  );
}

function roleBadgeVariant(
  role: TeamRole,
): "default" | "secondary" | "success" | "destructive" | "warning" | "info" {
  switch (role) {
    case "owner":
      return "default";
    case "editor":
      return "info";
    case "viewer":
      return "secondary";
  }
}

function TeamsContent() {
  const { teams, loading, selectTeam, refresh } = useTeamScope();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">teams</h1>
            {!loading && (
              <span className="text-sm text-muted-foreground">
                ({teams.length} of 5)
              </span>
            )}
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New team
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Teams share motors, simulations, and a separate token pool. You can
          belong to up to 5 teams.
        </p>

        {loading && (
          <Card>
            <CardContent className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 w-full animate-pulse rounded bg-muted"
                />
              ))}
            </CardContent>
          </Card>
        )}

        {!loading && teams.length === 0 && (
          <Card>
            <CardContent className="space-y-2 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                You&apos;re not in any teams yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Create one above, or paste an invite token at{" "}
                <span className="font-mono">/invite/&lt;token&gt;</span>.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && teams.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {teams.map((team) => (
              <Card
                key={team.team_id}
                className="group transition-colors hover:border-primary/50"
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-medium">{team.name}</p>
                      {team.description && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {team.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={roleBadgeVariant(team.role)}>
                      {team.role}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectTeam(team.team_id)}
                    >
                      Switch to
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/teams/${team.team_id}`}>
                        Open
                        <ArrowRight className="ml-2 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateTeamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={async (teamId) => {
          setCreateOpen(false);
          // Refresh the list so the switcher resolves to a real TeamSummary
          // before we point scope at it.
          await refresh();
          selectTeam(teamId);
        }}
      />
    </AppLayout>
  );
}

function CreateTeamDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (teamId: string) => void | Promise<void>;
}) {
  const api = useApiClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setDescription("");
    setError(null);
    setSubmitting(false);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { team_id } = await api.createTeam({
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
      });
      reset();
      await onCreated(team_id);
      router.push(`/teams/${team_id}`);
    } catch (err: unknown) {
      const status = apiErrorStatus(err);
      const detail = apiErrorDetail(err);
      if (
        status === 409 &&
        (detail?.toLowerCase().includes("limit") ||
          detail?.toLowerCase().includes("cap"))
      ) {
        setError(
          "You're already in 5 teams. Leave one to create or join another.",
        );
      } else {
        setError(detail ?? "Failed to create team.");
      }
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New team</DialogTitle>
          <DialogDescription>
            You become the team&apos;s first owner.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="team-name">Name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Cubesat propulsion"
              disabled={submitting}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="team-description">Description (optional)</Label>
            <Input
              id="team-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Shared motor & sim workspace"
              disabled={submitting}
            />
          </div>
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
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
            disabled={submitting || !name.trim()}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Creating…" : "Create team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
