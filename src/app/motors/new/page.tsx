"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MotorWizard } from "@/components/motor-wizard/MotorWizard";

export default function NewMotorPage() {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <AppSidebar />
        <main className="flex-1 overflow-auto p-8">
          <div className="mx-auto max-w-2xl">
            <h1 className="mb-8 text-2xl font-bold">Create New Motor</h1>
            <MotorWizard />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
