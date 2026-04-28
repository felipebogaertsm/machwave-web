"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { SolidMotorWizard } from "@/components/motor-wizard/solid/SolidMotorWizard";

export default function NewSolidMotorPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-2 text-2xl font-bold tracking-tight">
            new solid motor
          </h1>
          <p className="mb-8 text-sm text-muted-foreground">
            BATES-grain solid rocket motor.
          </p>
          <SolidMotorWizard />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
