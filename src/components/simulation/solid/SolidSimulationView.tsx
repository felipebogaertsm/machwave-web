"use client";

import type { ReactNode } from "react";
import type {
  IBSimParams,
  SolidSimulationResults,
} from "@/lib/api";
import { fractionToPercent, paToMpa } from "@/lib/units";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SolidResultsChart } from "./SolidResultsChart";

interface Props {
  results: SolidSimulationResults;
  params: IBSimParams;
}

function formatMetric(value: number): string {
  if (value === 0) return "0";
  const abs = Math.abs(value);
  let digits: number;
  if (abs >= 1000) digits = 0;
  else if (abs >= 100) digits = 1;
  else if (abs >= 10) digits = 2;
  else if (abs >= 1) digits = 3;
  else if (abs >= 0.01) digits = 4;
  else digits = 6;
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
    useGrouping: true,
  });
}

function StatGroup({
  title,
  children,
  columnsClassName = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  className,
}: {
  title: string;
  children: ReactNode;
  columnsClassName?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className={`grid gap-x-6 gap-y-2 text-sm ${columnsClassName}`}>
          {children}
        </dl>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/50 py-1">
      <dt className="truncate text-muted-foreground">{label}</dt>
      <dd className="tabular-nums font-medium">
        {typeof value === "number" ? formatMetric(value) : value}
        {unit ? (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

export function SolidSimulationView({ results, params }: Props) {
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardContent className="pt-6">
            <SolidResultsChart results={results} />
          </CardContent>
        </Card>

        <StatGroup
          title="Performance"
          columnsClassName="grid-cols-2 sm:grid-cols-3 xl:grid-cols-1"
        >
          <Stat label="Total Impulse" value={results.total_impulse} unit="N·s" />
          <Stat
            label="Specific Impulse"
            value={results.specific_impulse}
            unit="s"
          />
          <Stat label="Max Thrust" value={results.max_thrust} unit="N" />
          <Stat label="Avg Thrust" value={results.avg_thrust} unit="N" />
          <Stat label="Thrust Time" value={results.thrust_time} unit="s" />
          <Stat label="Burn Time" value={results.burn_time} unit="s" />
          <Stat
            label="Initial Propellant Mass"
            value={results.initial_propellant_mass}
            unit="kg"
          />
          <Stat label="Burn Profile" value={results.burn_profile} />
        </StatGroup>
      </div>

      <StatGroup title="Pressure & Efficiency">
        <Stat
          label="Max Chamber P"
          value={paToMpa(results.max_chamber_pressure)}
          unit="MPa"
        />
        <Stat
          label="Avg Chamber P"
          value={paToMpa(results.avg_chamber_pressure)}
          unit="MPa"
        />
        <Stat
          label="Avg Nozzle Eff."
          value={fractionToPercent(results.avg_nozzle_efficiency)}
          unit="%"
        />
        <Stat
          label="Avg Overall Eff."
          value={fractionToPercent(results.avg_overall_efficiency)}
          unit="%"
        />
        <Stat
          label="Volumetric Eff."
          value={fractionToPercent(results.volumetric_efficiency)}
          unit="%"
        />
        <Stat
          label="Max Mass Flux"
          value={results.max_mass_flux}
          unit="kg/(s·m²)"
        />
      </StatGroup>

      <StatGroup title="Klemmung (Kn)">
        <Stat label="Mean Kn" value={results.mean_klemmung} />
        <Stat label="Max Kn" value={results.max_klemmung} />
        <Stat
          label="Initial / Final Kn"
          value={results.initial_to_final_klemmung_ratio}
        />
      </StatGroup>

      <StatGroup title="Simulation Parameters">
        {params.d_t !== undefined && (
          <Stat label="Time Step" value={params.d_t} unit="s" />
        )}
        {params.igniter_pressure !== undefined && (
          <Stat
            label="Igniter P"
            value={paToMpa(params.igniter_pressure)}
            unit="MPa"
          />
        )}
        {params.external_pressure !== undefined && (
          <Stat
            label="External P"
            value={paToMpa(params.external_pressure)}
            unit="MPa"
          />
        )}
        {params.other_losses !== undefined && (
          <Stat label="Other Losses" value={params.other_losses} unit="%" />
        )}
      </StatGroup>
    </>
  );
}
