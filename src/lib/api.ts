/**
 * Typed API client.
 *
 * All methods attach the current user's Firebase ID token as a Bearer token.
 * Import `useApiClient` in components/hooks to get an authenticated instance.
 *
 * Type design notes
 * -----------------
 * The backend models motor configs and simulation results as discriminated
 * unions on `motor_type`. Today only "solid" is implemented client-side; when
 * "liquid" (or "hybrid") variants are added, they slot into the unions
 * (`MotorConfig`, `SimulationResults`) with their own `motor_type` literal —
 * no plumbing changes required in callers that already narrow on it.
 */
import axios, { type AxiosInstance } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Discriminator
// ---------------------------------------------------------------------------

export type MotorType = "solid";

// ---------------------------------------------------------------------------
// Propellants
// ---------------------------------------------------------------------------

export interface PropellantItem {
  id: string;
  name: string;
  motor_type: MotorType;
}

// ---------------------------------------------------------------------------
// Solid motor config
// ---------------------------------------------------------------------------

export interface BatesSegment {
  type: "bates";
  outer_diameter: number;
  core_diameter: number;
  length: number;
  density_ratio: number;
}

export type GrainSegment = BatesSegment;

export interface SolidGrain {
  segments: GrainSegment[];
  spacing: number;
}

export interface Nozzle {
  inlet_diameter: number;
  throat_diameter: number;
  divergent_angle: number;
  convergent_angle: number;
  expansion_ratio: number;
  c_1: number;
  c_2: number;
}

export interface CombustionChamber {
  casing_inner_diameter: number;
  casing_outer_diameter: number;
  internal_length: number;
  thermal_liner_thickness: number;
}

export interface SolidMotorThrustChamber {
  nozzle: Nozzle;
  combustion_chamber: CombustionChamber;
  dry_mass: number;
  nozzle_exit_to_grain_port_distance: number;
  center_of_gravity_coordinate: [number, number, number] | null;
}

export interface SolidMotorConfig {
  motor_type: "solid";
  propellant_id: string;
  grain: SolidGrain;
  thrust_chamber: SolidMotorThrustChamber;
}

// Discriminated union — extend with `| LiquidEngineConfig` when LRE lands.
export type MotorConfig = SolidMotorConfig;

// ---------------------------------------------------------------------------
// Motor records
// ---------------------------------------------------------------------------

export interface MotorSummary {
  motor_id: string;
  name: string;
  motor_type: MotorType;
  created_at: string;
  updated_at: string;
}

export interface MotorRecord {
  motor_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  config: MotorConfig;
}

export interface CreateMotorRequest {
  name: string;
  config: MotorConfig;
}

// ---------------------------------------------------------------------------
// Simulations
// ---------------------------------------------------------------------------

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

export type SimulationStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "retried";

// `retried` is an active state until the worker picks it up and transitions
// to `running`; the backend treats it the same as pending/running for
// blocked-while-active checks.
const TERMINAL_SIMULATION_STATUSES: ReadonlySet<SimulationStatus> = new Set([
  "done",
  "failed",
]);

export function isTerminalSimulationStatus(status: SimulationStatus): boolean {
  return TERMINAL_SIMULATION_STATUSES.has(status);
}

export interface SimulationStatusEvent {
  status: SimulationStatus;
  error: string | null;
  timestamp: string;
}

export interface SimulationSummary {
  simulation_id: string;
  motor_id: string;
  status: SimulationStatus;
  created_at: string;
  updated_at: string;
}

// `events` is the append-only trail (oldest first); the flat fields below are
// derived from it and kept for convenience.
export interface SimulationStatusRecord {
  simulation_id: string;
  events: SimulationStatusEvent[];
  status: SimulationStatus;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface RerunAllResponse {
  triggered: number;
  simulation_ids: string[];
}

export interface ClearAllMotorsResponse {
  deleted: number;
  user_ids: string[];
}

export interface ClearAllSimulationsResponse {
  deleted: number;
  user_ids: string[];
}

export interface SolidSimulationResults {
  motor_type: "solid";
  simulation_id: string;
  t: number[];
  thrust: number[];
  P_0: number[];
  P_exit: number[];
  m_prop: number[];
  burn_area: number[];
  propellant_volume: number[];
  free_chamber_volume: number[];
  web: number[];
  burn_rate: number[];
  C_f: number[];
  C_f_ideal: number[];
  nozzle_efficiency: number[];
  overall_efficiency: number[];
  eta_div: number[];
  eta_kin: number[];
  eta_bl: number[];
  eta_2p: number[];
  grain_mass_flux: number[][];
  propellant_cog: number[][];
  propellant_moi: number[][][];
  total_impulse: number;
  specific_impulse: number;
  thrust_time: number;
  burn_time: number;
  max_thrust: number;
  avg_thrust: number;
  max_chamber_pressure: number;
  avg_chamber_pressure: number;
  avg_nozzle_efficiency: number;
  avg_overall_efficiency: number;
  initial_propellant_mass: number;
  volumetric_efficiency: number;
  mean_klemmung: number;
  max_klemmung: number;
  initial_to_final_klemmung_ratio: number;
  max_mass_flux: number;
  burn_profile: string;
}

// Discriminated union — extend with `| LiquidSimulationResults` when LRE lands.
export type SimulationResults = SolidSimulationResults;

export interface SimulationDetails {
  simulation_id: string;
  motor_id: string;
  motor_config: MotorConfig;
  params: IBSimParams;
  results: SimulationResults;
}

// ---------------------------------------------------------------------------
// Account, usage, cost
// ---------------------------------------------------------------------------

// Credit / token state. `monthly_token_limit` and `tokens_remaining` are null
// for admins (unlimited). `tokens_used` is always populated.
export interface CreditAccount {
  monthly_token_limit: number | null;
  tokens_used: number;
  tokens_remaining: number | null;
  usage_period: string;
}

// For admins, storage *_limit and *_remaining come back null (unlimited).
// Counts are always populated.
export interface UsageSnapshot {
  motor_count: number;
  motor_limit: number | null;
  motors_remaining: number | null;
  simulation_count: number;
  simulation_limit: number | null;
  simulations_remaining: number | null;
  credits: CreditAccount;
  is_admin: boolean;
}

export interface AccountSnapshot {
  user_id: string;
  motor_limit: number | null;
  simulation_limit: number | null;
  credits: CreditAccount;
  is_admin: boolean;
  // Populated on admin responses only; null on /me/account.
  motor_count: number | null;
  simulation_count: number | null;
}

export interface EstimateSimulationResponse {
  estimated_tokens: number;
  credits: CreditAccount;
  can_afford: boolean;
}

export interface CreateSimulationResponse {
  simulation_id: string;
  estimated_tokens: number;
}

export interface SimulationCostRecord {
  simulation_id: string;
  estimated_tokens: number;
  actual_tokens: number | null;
  iterations: number | null;
  tokens_charged: number;
  period: string;
  created_at: string;
  completed_at: string | null;
  refunded: boolean;
}

export interface UpdateLimitsRequest {
  motor_limit?: number | null;
  simulation_limit?: number | null;
  monthly_token_limit?: number | null;
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

  async getMotor(motorId: string): Promise<MotorRecord> {
    const { data } = await this.http.get<MotorRecord>(`/motors/${motorId}`);
    return data;
  }

  async updateMotor(
    motorId: string,
    body: Partial<CreateMotorRequest>,
  ): Promise<MotorRecord> {
    const { data } = await this.http.put<MotorRecord>(
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
  ): Promise<CreateSimulationResponse> {
    const { data } = await this.http.post<CreateSimulationResponse>(
      "/simulations",
      body,
    );
    return data;
  }

  async estimateSimulation(
    body: CreateSimulationRequest,
  ): Promise<EstimateSimulationResponse> {
    const { data } = await this.http.post<EstimateSimulationResponse>(
      "/simulations/estimate",
      body,
    );
    return data;
  }

  async getSimulationCost(simId: string): Promise<SimulationCostRecord> {
    const { data } = await this.http.get<SimulationCostRecord>(
      `/simulations/${simId}/cost`,
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

  async getSimulationResults(simId: string): Promise<SimulationDetails> {
    const { data } = await this.http.get<SimulationDetails>(
      `/simulations/${simId}/results`,
    );
    return data;
  }

  async deleteSimulation(simId: string): Promise<void> {
    await this.http.delete(`/simulations/${simId}`);
  }

  async retrySimulation(simId: string): Promise<CreateSimulationResponse> {
    const { data } = await this.http.post<CreateSimulationResponse>(
      `/simulations/${simId}/retry`,
    );
    return data;
  }

  async rerunAllSimulations(): Promise<RerunAllResponse> {
    const { data } = await this.http.post<RerunAllResponse>(
      "/admin/simulations/rerun-all",
    );
    return data;
  }

  async adminClearAllMotors(userId?: string): Promise<ClearAllMotorsResponse> {
    const { data } = await this.http.delete<ClearAllMotorsResponse>(
      "/admin/motors/clear-all",
      { params: userId ? { user_id: userId } : undefined },
    );
    return data;
  }

  async adminClearAllSimulations(
    userId?: string,
  ): Promise<ClearAllSimulationsResponse> {
    const { data } = await this.http.delete<ClearAllSimulationsResponse>(
      "/admin/simulations/clear-all",
      { params: userId ? { user_id: userId } : undefined },
    );
    return data;
  }

  // ── Account / Usage ────────────────────────────────────────────────────────

  async getMyAccount(): Promise<AccountSnapshot> {
    const { data } = await this.http.get<AccountSnapshot>("/me/account");
    return data;
  }

  async getMyUsage(): Promise<UsageSnapshot> {
    const { data } = await this.http.get<UsageSnapshot>("/me/usage");
    return data;
  }

  // ── Health ─────────────────────────────────────────────────────────────────

  async health(): Promise<{ status: string }> {
    const { data } = await this.http.get<Record<string, string>>("/health");
    return { status: data.status ?? "unknown" };
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async clearAccount(userId: string): Promise<void> {
    await this.http.delete(`/users/${userId}/clear`);
  }

  async deleteAccount(userId: string, email: string): Promise<void> {
    await this.http.delete(`/users/${userId}`, { data: { email } });
  }

  // ── Admin: Users ───────────────────────────────────────────────────────────

  async adminListUsers(params?: {
    pageToken?: string;
    maxResults?: number;
  }): Promise<ListUsersResponse> {
    const { data } = await this.http.get<ListUsersResponse>("/admin/users", {
      params: {
        page_token: params?.pageToken,
        max_results: params?.maxResults,
      },
    });
    return data;
  }

  async adminSetRole(userId: string, role: UserRole): Promise<UserSummary> {
    const { data } = await this.http.put<UserSummary>(
      `/admin/users/${userId}/role`,
      { role },
    );
    return data;
  }

  async adminSetDisabled(
    userId: string,
    disabled: boolean,
  ): Promise<UserSummary> {
    const { data } = await this.http.put<UserSummary>(
      `/admin/users/${userId}/disabled`,
      { disabled },
    );
    return data;
  }

  async adminDeleteUser(userId: string): Promise<void> {
    await this.http.delete(`/admin/users/${userId}`);
  }

  async adminGetAccount(userId: string): Promise<AccountSnapshot> {
    const { data } = await this.http.get<AccountSnapshot>(
      `/admin/users/${userId}/account`,
    );
    return data;
  }

  async adminUpdateLimits(
    userId: string,
    body: UpdateLimitsRequest,
  ): Promise<AccountSnapshot> {
    const { data } = await this.http.put<AccountSnapshot>(
      `/admin/users/${userId}/limits`,
      body,
    );
    return data;
  }
}

// ---------------------------------------------------------------------------
// Admin: Users
// ---------------------------------------------------------------------------

export type UserRole = "admin" | "member";

export interface UserSummary {
  uid: string;
  email: string | null;
  email_verified: boolean;
  display_name: string | null;
  photo_url: string | null;
  disabled: boolean;
  role: UserRole;
  created_at: string | null;
  last_sign_in_at: string | null;
}

export interface ListUsersResponse {
  users: UserSummary[];
  next_page_token: string | null;
  has_more: boolean;
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
