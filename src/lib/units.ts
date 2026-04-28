/**
 * Unit conversion utilities.
 *
 * The UI displays human-readable units (mm, MPa, %). The API always receives
 * SI units (m, Pa, dimensionless fraction). All conversions are centralised
 * here so no magic numbers appear elsewhere in the codebase.
 */

import type { MotorConfig, SolidMotorConfig } from "@/lib/validations";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Millimetres → metres */
export const mmToM = (v: number): number => v / 1000;

/** Metres → millimetres */
export const mToMm = (v: number): number => v * 1000;

/** Megapascals → pascals */
export const mpaToPa = (v: number): number => v * 1e6;

/** Pascals → megapascals */
export const paToMpa = (v: number): number => v / 1e6;

/** Percentage (0–100) → dimensionless fraction (0–1) */
export const percentToFraction = (v: number): number => v / 100;

/** Dimensionless fraction (0–1) → percentage (0–100) */
export const fractionToPercent = (v: number): number => v * 100;

// ---------------------------------------------------------------------------
// Motor config payload transform
//
// Accepts a UI-shaped config (mm, %) and returns SI for the API.
// Dispatches on `motor_type`; new variants (liquid, hybrid) get their own
// branch here.
// ---------------------------------------------------------------------------

function solidConfigToApi(config: SolidMotorConfig): SolidMotorConfig {
  return {
    ...config,
    grain: {
      ...config.grain,
      spacing: mmToM(config.grain.spacing),
      segments: config.grain.segments.map((seg) => ({
        ...seg,
        outer_diameter: mmToM(seg.outer_diameter),
        core_diameter: mmToM(seg.core_diameter),
        length: mmToM(seg.length),
        density_ratio: percentToFraction(seg.density_ratio),
      })),
    },
    thrust_chamber: {
      ...config.thrust_chamber,
      nozzle: {
        ...config.thrust_chamber.nozzle,
        inlet_diameter: mmToM(config.thrust_chamber.nozzle.inlet_diameter),
        throat_diameter: mmToM(config.thrust_chamber.nozzle.throat_diameter),
        // angles, expansion_ratio, c_1, c_2 are dimensionless — no conversion
      },
      combustion_chamber: {
        casing_inner_diameter: mmToM(
          config.thrust_chamber.combustion_chamber.casing_inner_diameter,
        ),
        casing_outer_diameter: mmToM(
          config.thrust_chamber.combustion_chamber.casing_outer_diameter,
        ),
        internal_length: mmToM(
          config.thrust_chamber.combustion_chamber.internal_length,
        ),
        thermal_liner_thickness: mmToM(
          config.thrust_chamber.combustion_chamber.thermal_liner_thickness,
        ),
      },
      // dry_mass (kg) — no conversion
      nozzle_exit_to_grain_port_distance: mmToM(
        config.thrust_chamber.nozzle_exit_to_grain_port_distance,
      ),
    },
  };
}

export function toMotorApiConfig(config: MotorConfig): MotorConfig {
  switch (config.motor_type) {
    case "solid":
      return solidConfigToApi(config);
  }
}

// ---------------------------------------------------------------------------
// Simulation params payload transform
//
// Accepts params where pressures are in MPa.
// Returns params in SI units (Pa) suitable for the API.
// ---------------------------------------------------------------------------

export function toSimParamsApiPayload(params: {
  d_t?: number;
  igniter_pressure?: number;
  external_pressure?: number;
  other_losses?: number;
}): typeof params {
  return {
    ...params,
    ...(params.igniter_pressure !== undefined && {
      igniter_pressure: mpaToPa(params.igniter_pressure),
    }),
    ...(params.external_pressure !== undefined && {
      external_pressure: mpaToPa(params.external_pressure),
    }),
    // other_losses is already % — backend expects %; d_t is seconds — no change
  };
}
