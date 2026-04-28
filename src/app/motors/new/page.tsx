"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { MOTOR_TYPES } from "@/components/motor/motor-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

export default function NewMotorChooserPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">new motor</h1>
            <p className="text-sm text-muted-foreground">
              Choose the engine type to configure.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {MOTOR_TYPES.map((option) => {
              const inner = (
                <Card
                  className={
                    option.comingSoon
                      ? "h-full opacity-70"
                      : "group h-full transition-colors hover:border-primary/60 hover:bg-muted/40"
                  }
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {option.label}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                    {!option.comingSoon && (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    )}
                  </CardHeader>
                  {option.comingSoon && (
                    <CardContent>
                      <Badge variant="warning">Coming soon</Badge>
                    </CardContent>
                  )}
                </Card>
              );

              return option.comingSoon ? (
                <div
                  key={option.id}
                  aria-disabled
                  className="cursor-not-allowed"
                >
                  {inner}
                </div>
              ) : (
                <Link key={option.id} href={option.href} className="block">
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
