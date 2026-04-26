"use client";

import { useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { motorFormSchema, type MotorForm } from "@/lib/validations";
import { useApiClient } from "@/lib/api";
import { toMotorApiConfig } from "@/lib/units";
import { Button } from "@/components/ui/button";
import { GrainStep } from "./steps/GrainStep";
import { NozzleStep } from "./steps/NozzleStep";
import { ChamberStep } from "./steps/ChamberStep";
import { PropellantStep } from "./steps/PropellantStep";
import { ReviewStep } from "./steps/ReviewStep";

// ---------------------------------------------------------------------------
// Default values — KNSB_NAKKA / Olympus-like 2-segment motor
// ---------------------------------------------------------------------------
const DEFAULT_VALUES: MotorForm = {
  name: "",
  config: {
    propellant_id: "KNSB_NAKKA",
    grain: {
      segments: [
        {
          type: "bates",
          outer_diameter: 69,
          core_diameter: 25,
          length: 120,
          density_ratio: 100,
        },
        {
          type: "bates",
          outer_diameter: 69,
          core_diameter: 25,
          length: 120,
          density_ratio: 100,
        },
      ],
      spacing: 3,
    },
    thrust_chamber: {
      nozzle: {
        inlet_diameter: 40,
        throat_diameter: 23.5,
        divergent_angle: 12,
        convergent_angle: 45,
        expansion_ratio: 8,
        c_1: 0.00506,
        c_2: 0.0,
      },
      combustion_chamber: {
        casing_inner_diameter: 72,
        casing_outer_diameter: 76,
        internal_length: 300,
        thermal_liner_thickness: 3,
      },
      dry_mass: 1.2,
      nozzle_exit_to_grain_port_distance: 20,
      center_of_gravity_coordinate: null,
    },
  },
};

// ---------------------------------------------------------------------------
// Wizard step definitions
// ---------------------------------------------------------------------------
const STEPS = ["Propellant", "Grain", "Nozzle", "Chamber", "Review"] as const;
type StepName = (typeof STEPS)[number];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function MotorWizard() {
  const router = useRouter();
  const api = useApiClient();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<MotorForm>({
    resolver: zodResolver(motorFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  const {
    control,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors },
  } = form;

  // Field paths to validate per step (for early step validation)
  const stepFields: Record<StepName, FieldPath<MotorForm>[]> = {
    Propellant: ["name", "config.propellant_id"],
    Grain: ["config.grain"],
    Nozzle: ["config.thrust_chamber.nozzle"],
    Chamber: [
      "config.thrust_chamber.combustion_chamber",
      "config.thrust_chamber.dry_mass",
    ],
    Review: [],
  };

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  async function goNext() {
    const valid = await trigger(stepFields[currentStep]);
    if (valid) setStepIndex((i) => i + 1);
  }

  async function onSubmit(data: MotorForm) {
    setSubmitting(true);
    setServerError(null);
    try {
      const { motor_id } = await api.createMotor({
        name: data.name,
        config: toMotorApiConfig(data.config),
      });
      router.push(`/motors/${motor_id}`);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error && "response" in err
          ? ((err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail ?? "Failed to save motor. Please try again.")
          : "Failed to save motor. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Step indicator */}
      <div className="flex gap-2">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= stepIndex ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Step {stepIndex + 1} of {STEPS.length} — {currentStep}
      </p>

      {/* Step content */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
        className="space-y-6"
      >
        {currentStep === "Propellant" && (
          <PropellantStep control={control} errors={errors} />
        )}
        {currentStep === "Grain" && (
          <GrainStep control={control} errors={errors} />
        )}
        {currentStep === "Nozzle" && (
          <NozzleStep control={control} errors={errors} />
        )}
        {currentStep === "Chamber" && (
          <ChamberStep control={control} errors={errors} />
        )}
        {currentStep === "Review" && <ReviewStep data={getValues()} />}

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStepIndex((i) => i - 1)}
            disabled={stepIndex === 0}
          >
            Back
          </Button>

          {isLastStep ? (
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Create Motor"}
            </Button>
          ) : (
            <Button type="button" onClick={goNext}>
              Next
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
