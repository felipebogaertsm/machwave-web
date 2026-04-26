/**
 * Typed API client.
 *
 * All methods attach the current user's Firebase ID token as a Bearer token.
 * Import `useApiClient` in components/hooks to get an authenticated instance.
 */
import axios, { type AxiosInstance } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Type definitions — mirror the Pydantic response models
// ---------------------------------------------------------------------------

export interface PropellantItem {
  id: string;
  name: string;
}

export interface MotorSummary {
  motor_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SolidMotorConfig {
  propellant_id: string;
  grain: {
    segments: Array<{
      type: "bates";
      outer_diameter: number;
      core_diameter: number;
      length: number;
      density_ratio: number;
    }>;
    spacing: number;
  };
  thrust_chamber: {
    nozzle: {
      inlet_diameter: number;
      throat_diameter: number;
      divergent_angle: number;
      convergent_angle: number;
      expansion_ratio: number;
      c_1: number;
      c_2: number;
    };
    combustion_chamber: {
      casing_inner_diameter: number;
      casing_outer_diameter: number;
      internal_length: number;
      thermal_liner_thickness: number;
    };
    dry_mass: number;
    nozzle_exit_to_grain_port_distance: number;
    center_of_gravity_coordinate: [number, number, number] | null;
  };
}

export interface MotorDetail extends MotorSummary {
  config: SolidMotorConfig;
}

export interface CreateMotorRequest {
  name: string;
  config: SolidMotorConfig;
}

export interface IBSimParams {
  d_t?: number;
  igniter_pressure?: number;
  external_pressure?: number;
  other_losses?: number;
}

export interface CreateSimulationRequest {
  motor_id: string;
  params?: IBSimParams;
}

export interface SimulationSummary {
  simulation_id: string;
  motor_id: string;
  status: "pending" | "running" | "done" | "failed";
  created_at: string;
  updated_at: string;
}

export interface SimulationStatusRecord {
  simulation_id: string;
  status: "pending" | "running" | "done" | "failed";
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SimulationResults {
  simulation_id: string;
  t: number[];
  thrust: number[];
  P_0: number[];
  P_exit: number[];
  m_prop: number[];
  burn_area: number[];
  propellant_volume: number[];
  web: number[];
  burn_rate: number[];
  nozzle_efficiency: number[];
  overall_efficiency: number[];
  eta_div: number[];
  eta_kin: number[];
  eta_bl: number[];
  eta_2p: number[];
  total_impulse: number;
  specific_impulse: number;
  thrust_time: number;
  max_thrust: number;
  avg_thrust: number;
  max_chamber_pressure: number;
  burn_profile: string;
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

function createApiClient(getToken: () => Promise<string>): ApiClient {
  const http: AxiosInstance = axios.create({ baseURL: BASE_URL });

  http.interceptors.request.use(async (config) => {
    const token = await getToken();
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  return new ApiClient(http);
}

export class ApiClient {
  constructor(private readonly http: AxiosInstance) {}

  // ── Propellants ────────────────────────────────────────────────────────────

  async listPropellants(): Promise<PropellantItem[]> {
    const { data } = await this.http.get<PropellantItem[]>("/propellants");
    return data;
  }

  // ── Motors ─────────────────────────────────────────────────────────────────

  async createMotor(body: CreateMotorRequest): Promise<{ motor_id: string }> {
    const { data } = await this.http.post<{ motor_id: string }>(
      "/motors",
      body,
    );
    return data;
  }

  async listMotors(): Promise<MotorSummary[]> {
    const { data } = await this.http.get<MotorSummary[]>("/motors");
    return data;
  }

  async getMotor(motorId: string): Promise<MotorDetail> {
    const { data } = await this.http.get<MotorDetail>(`/motors/${motorId}`);
    return data;
  }

  async updateMotor(
    motorId: string,
    body: Partial<CreateMotorRequest>,
  ): Promise<MotorDetail> {
    const { data } = await this.http.put<MotorDetail>(
      `/motors/${motorId}`,
      body,
    );
    return data;
  }

  async deleteMotor(motorId: string): Promise<void> {
    await this.http.delete(`/motors/${motorId}`);
  }

  // ── Simulations ────────────────────────────────────────────────────────────

  async createSimulation(
    body: CreateSimulationRequest,
  ): Promise<{ simulation_id: string }> {
    const { data } = await this.http.post<{ simulation_id: string }>(
      "/simulations",
      body,
    );
    return data;
  }

  async listSimulations(): Promise<SimulationSummary[]> {
    const { data } = await this.http.get<SimulationSummary[]>("/simulations");
    return data;
  }

  async getSimulation(simId: string): Promise<SimulationSummary> {
    const { data } = await this.http.get<SimulationSummary>(
      `/simulations/${simId}`,
    );
    return data;
  }

  async getSimulationStatus(simId: string): Promise<SimulationStatusRecord> {
    const { data } = await this.http.get<SimulationStatusRecord>(
      `/simulations/${simId}/status`,
    );
    return data;
  }

  async getSimulationResults(simId: string): Promise<SimulationResults> {
    const { data } = await this.http.get<SimulationResults>(
      `/simulations/${simId}/results`,
    );
    return data;
  }

  async deleteSimulation(simId: string): Promise<void> {
    await this.http.delete(`/simulations/${simId}`);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async clearAccount(userId: string): Promise<void> {
    await this.http.delete(`/users/${userId}/clear`);
  }

  async deleteAccount(userId: string, email: string): Promise<void> {
    await this.http.delete(`/users/${userId}`, { data: { email } });
  }
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

import { useMemo } from "react";
import { useAuth } from "@/lib/auth";

export function useApiClient(): ApiClient {
  const { getIdToken } = useAuth();
  return useMemo(() => createApiClient(getIdToken), [getIdToken]);
}
