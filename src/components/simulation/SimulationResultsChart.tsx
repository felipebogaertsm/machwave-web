"use client";

import { useState } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SimulationResults } from "@/lib/api";

interface Props {
  results: SimulationResults;
}

type Tab = "thrust_pressure" | "efficiency" | "burn";

const TABS: { id: Tab; label: string }[] = [
  { id: "thrust_pressure", label: "Thrust & Pressure" },
  { id: "efficiency", label: "Efficiency" },
  { id: "burn", label: "Burn" },
];

export function SimulationResultsChart({ results }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("thrust_pressure");

  // Build chart data
  const data = results.t.map((t, i) => ({
    t: parseFloat(t.toFixed(4)),
    thrust: parseFloat(results.thrust[i].toFixed(2)),
    P_0_MPa: parseFloat((results.P_0[i] / 1e6).toFixed(4)),
    nozzle_efficiency: parseFloat(
      (results.nozzle_efficiency[i] * 100).toFixed(2),
    ),
    overall_efficiency: parseFloat(
      (results.overall_efficiency[i] * 100).toFixed(2),
    ),
    eta_div: parseFloat((results.eta_div[i] * 100).toFixed(2)),
    eta_kin: parseFloat((results.eta_kin[i] * 100).toFixed(2)),
    eta_bl: parseFloat((results.eta_bl[i] * 100).toFixed(2)),
    eta_2p: parseFloat((results.eta_2p[i] * 100).toFixed(2)),
    burn_area: parseFloat((results.burn_area[i] * 1e4).toFixed(4)), // cm²
    burn_rate: parseFloat((results.burn_rate[i] * 1000).toFixed(4)), // mm/s
  }));

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg border p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="t"
            label={{
              value: "Time (s)",
              position: "insideBottomRight",
              offset: -8,
            }}
            tick={{ fontSize: 11 }}
          />

          {activeTab === "thrust_pressure" && (
            <>
              <YAxis
                yAxisId="thrust"
                orientation="left"
                label={{
                  value: "Thrust (N)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="pressure"
                orientation="right"
                label={{
                  value: "Chamber P (MPa)",
                  angle: 90,
                  position: "insideRight",
                  offset: 12,
                }}
                tick={{ fontSize: 11 }}
              />
              <Line
                yAxisId="thrust"
                type="monotone"
                dataKey="thrust"
                stroke="#f97316"
                dot={false}
                name="Thrust (N)"
                strokeWidth={2}
              />
              <Line
                yAxisId="pressure"
                type="monotone"
                dataKey="P_0_MPa"
                stroke="#3b82f6"
                dot={false}
                name="P₀ (MPa)"
                strokeWidth={2}
              />
            </>
          )}

          {activeTab === "efficiency" && (
            <>
              <YAxis
                yAxisId="pct"
                domain={[0, 105]}
                label={{
                  value: "Efficiency (%)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                }}
                tick={{ fontSize: 11 }}
              />
              {[
                { key: "nozzle_efficiency", label: "Nozzle", color: "#a855f7" },
                {
                  key: "overall_efficiency",
                  label: "Overall",
                  color: "#22c55e",
                },
                { key: "eta_div", label: "η_div", color: "#eab308" },
                { key: "eta_kin", label: "η_kin", color: "#ec4899" },
                { key: "eta_bl", label: "η_bl", color: "#06b6d4" },
                { key: "eta_2p", label: "η_2p", color: "#f97316" },
              ].map(({ key, label, color }) => (
                <Line
                  key={key}
                  yAxisId="pct"
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  dot={false}
                  name={`${label} (%)`}
                  strokeWidth={1.5}
                />
              ))}
            </>
          )}

          {activeTab === "burn" && (
            <>
              <YAxis
                yAxisId="area"
                orientation="left"
                label={{
                  value: "Burn Area (cm²)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="rate"
                orientation="right"
                label={{
                  value: "Burn Rate (mm/s)",
                  angle: 90,
                  position: "insideRight",
                  offset: 12,
                }}
                tick={{ fontSize: 11 }}
              />
              <Line
                yAxisId="area"
                type="monotone"
                dataKey="burn_area"
                stroke="#f97316"
                dot={false}
                name="Burn Area (cm²)"
                strokeWidth={2}
              />
              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="burn_rate"
                stroke="#3b82f6"
                dot={false}
                name="Burn Rate (mm/s)"
                strokeWidth={2}
              />
            </>
          )}

          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(value) =>
              typeof value === "number" ? value.toFixed(3) : String(value ?? "")
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
