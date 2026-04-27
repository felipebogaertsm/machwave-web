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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Flame, Activity } from "lucide-react";

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
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">dashboard</h1>
          <Button asChild>
            <Link href="/motors/new">
              <Plus className="mr-2 h-4 w-4" />
              New Motor
            </Link>
          </Button>
        </div>

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
            <p className="text-sm text-muted-foreground">
              No motors yet.{" "}
              <Link
                href="/motors/new"
                className="text-primary underline-offset-4 hover:underline"
              >
                Create your first motor.
              </Link>
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2 space-y-2">
                      <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                      <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                    </CardHeader>
                  </Card>
                ))
              : motors.map((motor) => (
                  <Link
                    key={motor.motor_id}
                    href={`/motors/${motor.motor_id}`}
                  >
                    <Card className="transition-shadow hover:shadow-md cursor-pointer">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          {motor.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Updated{" "}
                          {new Date(motor.updated_at).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
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
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="space-y-2">
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
              >
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">
                        Simulation{" "}
                        <span className="font-mono text-xs text-muted-foreground">
                          {sim.simulation_id.slice(0, 8)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
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
