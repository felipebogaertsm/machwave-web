"use client";

import Link from "next/link";
import { Check, ChevronDown, Plus, User, Users } from "lucide-react";
import { useTeamScope } from "@/lib/team-scope";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TeamSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { scope, teams, selectPersonal, selectTeam } = useTeamScope();

  const label = scope.kind === "team" ? scope.team.name : "Personal";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {scope.kind === "team" ? (
            <Users className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[14rem]"
      >
        <DropdownMenuLabel>Workspace</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => {
            selectPersonal();
            onNavigate?.();
          }}
          className="justify-between"
        >
          <span className="inline-flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Personal
          </span>
          {scope.kind === "personal" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>

        {teams.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Teams</DropdownMenuLabel>
            {teams.map((team) => {
              const active =
                scope.kind === "team" && scope.team.team_id === team.team_id;
              return (
                <DropdownMenuItem
                  key={team.team_id}
                  onClick={() => {
                    selectTeam(team.team_id);
                    onNavigate?.();
                  }}
                  className="justify-between"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Users className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 truncate">{team.name}</span>
                    <span className="ml-1 shrink-0 text-[10px] uppercase text-muted-foreground">
                      {team.role}
                    </span>
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/teams"
            onClick={onNavigate}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Manage teams
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
