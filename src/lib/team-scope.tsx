"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useApiClient, type TeamSummary, type TeamRole } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Active scope for motor/sim CRUD. "personal" routes to /motors, /simulations;
// "team" routes to /teams/{tid}/... — see ApiClient methods which accept an
// optional teamId.
export type TeamScope =
  | { kind: "personal" }
  | { kind: "team"; team: TeamSummary };

interface TeamScopeContextValue {
  scope: TeamScope;
  teams: TeamSummary[];
  loading: boolean;
  // The caller's role in the active team. null when scope is personal.
  role: TeamRole | null;
  // The active team_id (or undefined). Pass straight to ApiClient methods.
  teamId: string | undefined;
  selectPersonal: () => void;
  selectTeam: (teamId: string) => void;
  refresh: () => Promise<void>;
}

const TeamScopeContext = createContext<TeamScopeContextValue | null>(null);

const STORAGE_KEY = "machwave.activeTeamId";

function readPersistedTeamId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writePersistedTeamId(value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, value);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore quota/disabled storage */
  }
}

export function TeamScopeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const api = useApiClient();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    // Yield once so any state writes that follow happen outside the
    // synchronous body of a calling effect (react-hooks/set-state-in-effect).
    await Promise.resolve();
    if (!user) {
      setTeams([]);
      setActiveTeamId(null);
      setLoading(false);
      return;
    }
    try {
      const list = await api.listTeams();
      setTeams(list);
      // If a persisted team is no longer in the user's list (kicked, deleted),
      // silently drop back to personal — surfaces as 404s otherwise.
      const persisted = readPersistedTeamId();
      const stillValid = persisted && list.some((t) => t.team_id === persisted);
      if (stillValid) {
        setActiveTeamId(persisted);
      } else if (persisted) {
        writePersistedTeamId(null);
        setActiveTeamId(null);
      }
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  useEffect(() => {
    // fetchTeams defers all state writes via `await Promise.resolve()` so
    // they don't run synchronously inside the effect. The linter can't see
    // through async callbacks.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTeams();
  }, [fetchTeams]);

  const selectPersonal = useCallback(() => {
    writePersistedTeamId(null);
    setActiveTeamId(null);
  }, []);

  const selectTeam = useCallback((teamId: string) => {
    writePersistedTeamId(teamId);
    setActiveTeamId(teamId);
  }, []);

  const value = useMemo<TeamScopeContextValue>(() => {
    const team = activeTeamId
      ? (teams.find((t) => t.team_id === activeTeamId) ?? null)
      : null;
    const scope: TeamScope = team
      ? { kind: "team", team }
      : { kind: "personal" };
    return {
      scope,
      teams,
      loading,
      role: team?.role ?? null,
      teamId: team?.team_id,
      selectPersonal,
      selectTeam,
      refresh: fetchTeams,
    };
  }, [activeTeamId, teams, loading, selectPersonal, selectTeam, fetchTeams]);

  return (
    <TeamScopeContext.Provider value={value}>
      {children}
    </TeamScopeContext.Provider>
  );
}

export function useTeamScope(): TeamScopeContextValue {
  const ctx = useContext(TeamScopeContext);
  if (!ctx)
    throw new Error("useTeamScope must be used inside <TeamScopeProvider>");
  return ctx;
}

// Convenience: just the active team_id (or undefined for personal scope).
// Pass directly to ApiClient methods that accept an optional teamId.
export function useScopeTeamId(): string | undefined {
  return useTeamScope().teamId;
}

// Permission helpers that read from the active scope's role. Personal scope
// always returns true for own data; team scope checks the membership role.
export function canEdit(role: TeamRole | null): boolean {
  if (role == null) return true;
  return role === "owner" || role === "editor";
}

export function canManageTeam(role: TeamRole | null): boolean {
  return role === "owner";
}
