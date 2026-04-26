"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { MotorWizard } from "@/components/motor-wizard/MotorWizard";

export default function NewMotorPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-8 text-2xl font-bold">Create New Motor</h1>
          <MotorWizard />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
