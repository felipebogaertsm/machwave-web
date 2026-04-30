"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Loader2,
  Mail,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useApiClient, type InviteInspectResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTeamScope } from "@/lib/team-scope";
import { apiErrorDetail, apiErrorStatus } from "@/lib/api-errors";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function InviteLandingPage() {
  return (
    <ProtectedRoute>
      <InviteContent />
    </ProtectedRoute>
  );
}

function InviteContent() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const api = useApiClient();
  const { user } = useAuth();
  const { refresh: refreshScope, selectTeam } = useTeamScope();

  const [preview, setPreview] = useState<InviteInspectResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptedTeamId, setAcceptedTeamId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .inspectInvite(token)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = apiErrorStatus(err);
        if (status === 404) {
          setLoadError(
            "This invite link isn't valid. It may have been revoked or never existed.",
          );
        } else {
          setLoadError(apiErrorDetail(err) ?? "Failed to load invite.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, token]);

  async function handleAccept() {
    if (!preview) return;
    setAccepting(true);
    setAcceptError(null);
    try {
      await api.acceptInvite(token);
      await refreshScope();
      selectTeam(preview.team_id);
      setAcceptedTeamId(preview.team_id);
    } catch (err: unknown) {
      const status = apiErrorStatus(err);
      const detail = apiErrorDetail(err);
      if (status === 409) {
        const lc = detail?.toLowerCase() ?? "";
        if (lc.includes("limit") || lc.includes("cap")) {
          setAcceptError(
            "You're already in 5 teams. Leave one to join another.",
          );
        } else if (lc.includes("already")) {
          setAcceptError(detail ?? "You're already a member of this team.");
        } else if (lc.includes("expired")) {
          setAcceptError("This invite has expired.");
        } else if (lc.includes("revoked")) {
          setAcceptError("This invite was revoked.");
        } else if (lc.includes("used") || lc.includes("accepted")) {
          setAcceptError("This invite has already been used.");
        } else {
          setAcceptError(detail ?? "Couldn't accept this invite.");
        }
      } else {
        setAcceptError(detail ?? "Couldn't accept this invite.");
      }
    } finally {
      setAccepting(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-xl space-y-4 py-6">
        {loadError && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <TriangleAlert className="h-5 w-5" />
                Invite unavailable
              </CardTitle>
              <CardDescription>{loadError}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => router.push("/teams")}>
                Go to your teams
              </Button>
            </CardContent>
          </Card>
        )}

        {!loadError && !preview && (
          <Card>
            <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading invite…
            </CardContent>
          </Card>
        )}

        {preview && acceptedTeamId == null && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Join {preview.team_name}
              </CardTitle>
              <CardDescription>
                You&apos;ve been invited to collaborate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Team</dt>
                <dd className="font-medium">{preview.team_name}</dd>

                <dt className="text-muted-foreground">Role</dt>
                <dd>
                  <Badge variant="secondary" className="uppercase">
                    {preview.role}
                  </Badge>
                </dd>

                {preview.invitee_email && (
                  <>
                    <dt className="text-muted-foreground">Sent to</dt>
                    <dd className="inline-flex items-center gap-1.5 text-sm">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {preview.invitee_email}
                    </dd>
                  </>
                )}

                <dt className="text-muted-foreground">Expires</dt>
                <dd>{new Date(preview.expires_at).toLocaleString()}</dd>

                <dt className="text-muted-foreground">Signed in as</dt>
                <dd className="font-mono text-xs">{user?.email}</dd>
              </dl>

              {!preview.is_usable && (
                <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    This invite has expired or been used. Ask the team owner to
                    send a new one.
                  </span>
                </p>
              )}

              {preview.invitee_email &&
                user?.email &&
                preview.invitee_email.toLowerCase() !==
                  user.email.toLowerCase() && (
                  <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      This invite was addressed to{" "}
                      <span className="font-mono">{preview.invitee_email}</span>
                      , but you&apos;re signed in as{" "}
                      <span className="font-mono">{user.email}</span>. The
                      token still works, but double-check this is intended.
                    </span>
                  </p>
                )}

              {acceptError && (
                <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{acceptError}</span>
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleAccept}
                  disabled={!preview.is_usable || accepting}
                >
                  {accepting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {accepting ? "Joining…" : "Accept and join"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/teams")}
                  disabled={accepting}
                >
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {acceptedTeamId && (
          <Card className="border-emerald-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Joined {preview?.team_name ?? "team"}
              </CardTitle>
              <CardDescription>
                Your active workspace is now this team. Personal motors and
                simulations are still safe — switch back any time from the
                sidebar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push(`/teams/${acceptedTeamId}`)}>
                Open team workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
