"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useApiClient,
  type MotorSummary,
  type SimulationSummary,
} from "@/lib/api";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { NewMotorButton } from "@/components/motor/NewMotorButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Activity, ChevronRight, Sparkles } from "lucide-react";

function statusVariant(
  status: SimulationSummary["status"],
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

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const api = useApiClient();
  const [motors, setMotors] = useState<MotorSummary[]>([]);
  const [sims, setSims] = useState<SimulationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listMotors(), api.listSimulations()])
      .then(([m, s]) => {
        setMotors(m);
        setSims(s);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">dashboard</h1>
          <NewMotorButton />
        </div>

        {!loading && motors.length === 0 && sims.length === 0 && (
          <Link href="/getting-started/solid" className="block">
            <Card className="group border-primary/30 bg-primary/5 transition-colors hover:border-primary/60 hover:bg-primary/10 cursor-pointer">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    New here? Simulate your first solid motor in 3 steps.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    A short walkthrough — get to a thrust curve fast.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Motors */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">
              Motors{" "}
              {loading ? (
                <span className="inline-block h-4 w-8 align-middle rounded bg-muted animate-pulse" />
              ) : (
                <>({motors.length})</>
              )}
            </h2>
          </div>
          {motors.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">No motors yet.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="h-9 w-9 shrink-0 rounded-md bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              : motors.map((motor) => (
                  <Link
                    key={motor.motor_id}
                    href={`/motors/${motor.motor_id}`}
                    className="block"
                  >
                    <Card className="group transition-colors hover:border-primary/50 hover:bg-muted/40 cursor-pointer">
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-500">
                          <Flame className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {motor.name}
                            </p>
                            <Badge variant="secondary" className="text-[10px]">
                              {motor.motor_type.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Updated{" "}
                            {new Date(motor.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
          </div>
        </section>

        {/* Simulations */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">
              Recent Simulations{" "}
              {loading ? (
                <span className="inline-block h-4 w-8 align-middle rounded bg-muted animate-pulse" />
              ) : (
                <>({sims.length})</>
              )}
            </h2>
          </div>
          {sims.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">No simulations yet.</p>
          )}
          <div className="space-y-2">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="h-9 w-9 shrink-0 rounded-md bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                      <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                    </div>
                    <div className="h-5 w-16 rounded bg-muted animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            {!loading &&
              sims.slice(0, 10).map((sim) => (
                <Link
                  key={sim.simulation_id}
                  href={`/simulations/${sim.simulation_id}`}
                  className="block"
                >
                  <Card className="transition-colors hover:border-primary/50 hover:bg-muted/40 cursor-pointer">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          Simulation{" "}
                          <span className="font-mono text-xs text-muted-foreground">
                            {sim.simulation_id.slice(0, 8)}
                          </span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {new Date(sim.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={statusVariant(sim.status)}>
                        {sim.status}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
