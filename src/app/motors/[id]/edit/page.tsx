"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useApiClient, type MotorRecord } from "@/lib/api";
import { useTeamScope } from "@/lib/team-scope";
import { fromMotorApiConfig } from "@/lib/units";
import type { SolidMotorForm } from "@/lib/validations";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Spinner } from "@/components/ui/spinner";
import { SolidMotorWizard } from "@/components/motor-wizard/solid/SolidMotorWizard";

export default function EditMotorPage() {
  return (
    <ProtectedRoute>
      <EditMotorContent />
    </ProtectedRoute>
  );
}

function EditMotorContent() {
  const params = useParams();
  const motorId = params.id as string;
  const api = useApiClient();
  const { teamId } = useTeamScope();
  const [motor, setMotor] = useState<MotorRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMotor(motorId, teamId)
      .then(setMotor)
      .catch(() => setError("Motor not found"));
  }, [api, motorId, teamId]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">edit motor</h1>
        {motor && (
          <p className="mb-8 text-sm text-muted-foreground">{motor.name}</p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!motor && !error && <Spinner />}

        {motor && motor.config.motor_type === "solid" && (
          <SolidMotorWizard
            mode="edit"
            motorId={motorId}
            initialValues={
              {
                name: motor.name,
                config: fromMotorApiConfig(motor.config),
              } satisfies SolidMotorForm
            }
          />
        )}
      </div>
    </AppLayout>
  );
}
