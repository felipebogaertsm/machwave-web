"use client";

import { useState } from "react";
import {
  useForm,
  type Control,
  type FieldErrors,
  type FieldPath,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  motorFormSchema,
  type MotorForm,
  type SolidMotorForm,
} from "@/lib/validations";
import { Loader2 } from "lucide-react";
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
//
// Solid-only for now. When liquid lands, the wizard will branch on motor_type
// (likely via a leading "Motor Type" step) and pick the right defaults.
// ---------------------------------------------------------------------------
const DEFAULT_VALUES: SolidMotorForm = {
  name: "",
  config: {
    motor_type: "solid",
    propellant_id: "KNSB_NAKKA",
    grain: {
      segments: [
        {
          type: "bates",
          outer_diameter: NaN,
          core_diameter: NaN,
          length: NaN,
          density_ratio: NaN,
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

type Props =
  | { mode?: "create" }
  | { mode: "edit"; motorId: string; initialValues: SolidMotorForm };

export function SolidMotorWizard(props: Props = {}) {
  const isEdit = props.mode === "edit";
  const motorId = isEdit ? props.motorId : undefined;
  const initialValues = isEdit ? props.initialValues : DEFAULT_VALUES;

  const router = useRouter();
  const api = useApiClient();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<MotorForm>({
    resolver: zodResolver(motorFormSchema),
    defaultValues: initialValues,
    mode: "onBlur",
  });

  const {
    control,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors },
  } = form;

  // The wizard is solid-only today; narrow control/errors so step components
  // can author against `SolidMotorForm` paths without union-narrowing noise.
  const solidControl = control as unknown as Control<SolidMotorForm>;
  const solidErrors = errors as FieldErrors<SolidMotorForm>;

  // Field paths to validate per step (for early step validation)
  const stepFields: Record<StepName, FieldPath<SolidMotorForm>[]> = {
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
    const valid = await trigger(
      stepFields[currentStep] as FieldPath<MotorForm>[],
    );
    if (valid) setStepIndex((i) => i + 1);
  }

  async function onSubmit(data: MotorForm) {
    setSubmitting(true);
    setServerError(null);
    try {
      if (isEdit && motorId) {
        await api.updateMotor(motorId, {
          name: data.name,
          config: toMotorApiConfig(data.config),
        });
        router.push(`/motors/${motorId}`);
      } else {
        const { motor_id } = await api.createMotor({
          name: data.name,
          config: toMotorApiConfig(data.config),
        });
        router.push(`/motors/${motor_id}`);
      }
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
          <PropellantStep control={solidControl} errors={solidErrors} />
        )}
        {currentStep === "Grain" && (
          <GrainStep control={solidControl} errors={solidErrors} />
        )}
        {currentStep === "Nozzle" && (
          <NozzleStep control={solidControl} errors={solidErrors} />
        )}
        {currentStep === "Chamber" && (
          <ChamberStep control={solidControl} errors={solidErrors} />
        )}
        {currentStep === "Review" && (
          <ReviewStep data={getValues() as SolidMotorForm} />
        )}

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        {/* Navigation
            On the Review step the submit button moves to its own row below
            so an accidental second click after pressing Next can't land on
            the Submit position and skip past Review. */}
        <div className="space-y-3 pt-4">
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStepIndex((i) => i - 1)}
              disabled={stepIndex === 0}
            >
              Back
            </Button>

            {!isLastStep && (
              <Button type="button" onClick={goNext}>
                Next
              </Button>
            )}
          </div>

          {isLastStep && (
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {submitting
                ? "Saving…"
                : isEdit
                  ? "Save Changes"
                  : "Create Motor"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
