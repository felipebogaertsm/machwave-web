"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApiClient, type MotorSummary } from "@/lib/api";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";

type SortKey = "name" | "motor_type" | "created_at" | "updated_at";
type SortDir = "asc" | "desc";

export default function MotorsPage() {
  return (
    <ProtectedRoute>
      <MotorsContent />
    </ProtectedRoute>
  );
}

function MotorsContent() {
  const api = useApiClient();
  const router = useRouter();
  const [motors, setMotors] = useState<MotorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    api
      .listMotors()
      .then(setMotors)
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "motor_type" ? "asc" : "desc");
    }
  }

  const sorted = [...motors].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl font-bold tracking-tight">motors</h1>
          {!loading && (
            <span className="text-sm text-muted-foreground">
              ({motors.length})
            </span>
          )}
        </div>

        {loading && (
          <Card>
            <CardContent className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 w-full animate-pulse rounded bg-muted"
                />
              ))}
            </CardContent>
          </Card>
        )}

        {!loading && motors.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <p className="text-sm text-muted-foreground">
                No motors yet. Use the sidebar to create one.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && motors.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                      <SortHeader
                        label="Name"
                        sortKey="name"
                        active={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="left"
                      />
                      <SortHeader
                        label="Type"
                        sortKey="motor_type"
                        active={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="left"
                      />
                      <SortHeader
                        label="Created"
                        sortKey="created_at"
                        active={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="right"
                      />
                      <SortHeader
                        label="Updated"
                        sortKey="updated_at"
                        active={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="right"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((motor) => (
                      <tr
                        key={motor.motor_id}
                        onClick={() => router.push(`/motors/${motor.motor_id}`)}
                        className="cursor-pointer border-b last:border-0 transition-colors hover:bg-accent/40"
                      >
                        <td className="px-3 py-3">
                          <p className="font-medium">{motor.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {motor.motor_id}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant="secondary" className="text-[10px]">
                            {motor.motor_type.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">
                          {new Date(motor.created_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">
                          {new Date(motor.updated_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onClick,
  align,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
  align: "left" | "right";
}) {
  const isActive = active === sortKey;
  return (
    <th
      className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${
          isActive ? "text-foreground" : ""
        }`}
      >
        {label}
        {isActive && <span aria-hidden>{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
