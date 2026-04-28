/**
 * Zod validation schemas for motor and simulation forms.
 * These mirror the Pydantic v2 schemas in machwave-api exactly.
 *
 * Motor configs are modelled as a discriminated union on `motor_type`.
 * Today only "solid" exists; adding "liquid" is a matter of writing a new
 * config schema and appending it to `motorConfigSchema` / `motorFormSchema`.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Grain
// ---------------------------------------------------------------------------

export const batesSegmentSchema = z
  .object({
    type: z.literal("bates"),
    outer_diameter: z
      .number()
      .positive("Must be positive")
      .describe("Outer diameter [mm]"),
    core_diameter: z
      .number()
      .positive("Must be positive")
      .describe("Core diameter [mm]"),
    length: z
      .number()
      .positive("Must be positive")
      .describe("Segment length [mm]"),
    density_ratio: z
      .number()
      .min(0)
      .max(100)
      .describe("Packing density ratio [%]"),
  })
  .refine((d) => d.outer_diameter > d.core_diameter, {
    message: "Outer diameter must be greater than core diameter",
    path: ["core_diameter"],
  });

export type BatesSegment = z.infer<typeof batesSegmentSchema>;

export const grainSchema = z.object({
  segments: z
    .array(batesSegmentSchema)
    .min(1, "At least one segment is required"),
  spacing: z.number().min(0).describe("Inter-segment spacing [mm]"),
});

export type Grain = z.infer<typeof grainSchema>;

// ---------------------------------------------------------------------------
// Nozzle
// ---------------------------------------------------------------------------

export const nozzleSchema = z
  .object({
    inlet_diameter: z.number().positive().describe("Inlet diameter [mm]"),
    throat_diameter: z.number().positive().describe("Throat diameter [mm]"),
    divergent_angle: z
      .number()
      .positive()
      .max(30, "Typically ≤ 30°")
      .describe("Divergent half-angle [°]"),
    convergent_angle: z
      .number()
      .positive()
      .max(60, "Typically ≤ 60°")
      .describe("Convergent half-angle [°]"),
    expansion_ratio: z.number().min(1, "Must be ≥ 1").describe("Ae/At"),
    c_1: z.number(),
    c_2: z.number(),
  })
  .refine((d) => d.throat_diameter < d.inlet_diameter, {
    message: "Throat diameter must be less than inlet diameter",
    path: ["throat_diameter"],
  });

export type Nozzle = z.infer<typeof nozzleSchema>;

// ---------------------------------------------------------------------------
// Combustion chamber
// ---------------------------------------------------------------------------

export const combustionChamberSchema = z
  .object({
    casing_inner_diameter: z
      .number()
      .positive()
      .describe("Casing inner diameter [mm]"),
    casing_outer_diameter: z
      .number()
      .positive()
      .describe("Casing outer diameter [mm]"),
    internal_length: z
      .number()
      .positive()
      .describe("Chamber internal length [mm]"),
    thermal_liner_thickness: z
      .number()
      .min(0)
      .describe("Thermal liner thickness [mm]"),
  })
  .refine((d) => d.casing_outer_diameter > d.casing_inner_diameter, {
    message: "Outer diameter must be greater than inner diameter",
    path: ["casing_outer_diameter"],
  });

export type CombustionChamber = z.infer<typeof combustionChamberSchema>;

// ---------------------------------------------------------------------------
// Solid motor — thrust chamber + config
// ---------------------------------------------------------------------------

export const solidMotorThrustChamberSchema = z.object({
  nozzle: nozzleSchema,
  combustion_chamber: combustionChamberSchema,
  dry_mass: z.number().positive().describe("Dry mass [kg]"),
  nozzle_exit_to_grain_port_distance: z
    .number()
    .min(0)
    .describe("Nozzle exit to grain port distance [mm]"),
  center_of_gravity_coordinate: z
    .tuple([z.number(), z.number(), z.number()])
    .nullable()
    .describe("CoG (x, y, z) from nozzle exit [m]"),
});

export type SolidMotorThrustChamber = z.infer<
  typeof solidMotorThrustChamberSchema
>;

export const solidMotorConfigSchema = z.object({
  motor_type: z.literal("solid"),
  propellant_id: z.string().min(1, "Select a propellant"),
  grain: grainSchema,
  thrust_chamber: solidMotorThrustChamberSchema,
});

export type SolidMotorConfig = z.infer<typeof solidMotorConfigSchema>;

// ---------------------------------------------------------------------------
// Motor config — discriminated union
//
// Extend with `liquidMotorConfigSchema` (and a "liquid" literal) when LRE
// support lands. `MotorConfig` and `motorFormSchema` will narrow correctly.
// ---------------------------------------------------------------------------

export const motorConfigSchema = z.discriminatedUnion("motor_type", [
  solidMotorConfigSchema,
]);

export type MotorConfig = z.infer<typeof motorConfigSchema>;

export const motorFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Max 100 characters"),
  config: motorConfigSchema,
});

export type MotorForm = z.infer<typeof motorFormSchema>;

/**
 * Form shape when the wizard is locked to solid. Until we add a motor-type
 * selection step, the wizard authors against this narrowed view to keep
 * react-hook-form paths fully typed.
 */
export type SolidMotorForm = MotorForm & { config: SolidMotorConfig };

// ---------------------------------------------------------------------------
// Simulation parameters
// ---------------------------------------------------------------------------

export const ibSimParamsSchema = z.object({
  d_t: z.number().positive().default(0.01).describe("Time step [s]"),
  igniter_pressure: z
    .number()
    .positive()
    .default(1.0)
    .describe("Igniter pressure [MPa]"),
  external_pressure: z
    .number()
    .positive()
    .default(0.101325)
    .describe("External pressure [MPa]"),
  other_losses: z
    .number()
    .min(0)
    .max(100)
    .default(12.0)
    .describe("Other losses [%]"),
});

export type IBSimParams = z.infer<typeof ibSimParamsSchema>;

export const createSimulationSchema = z.object({
  motor_id: z.string().min(1),
  params: ibSimParamsSchema,
});

export type CreateSimulation = z.infer<typeof createSimulationSchema>;
