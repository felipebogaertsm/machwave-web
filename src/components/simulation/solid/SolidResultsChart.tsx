"use client";

import { useMemo, useRef, useState } from "react";
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
import type { SolidSimulationResults } from "@/lib/api";
import { paToMpa } from "@/lib/units";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Image as ImageIcon } from "lucide-react";

interface Props {
  results: SolidSimulationResults;
}

type View =
  | "thrust_pressure"
  | "exit_pressure"
  | "efficiency"
  | "losses"
  | "burn"
  | "mass_web"
  | "volumes"
  | "thrust_coeff"
  | "mass_flux"
  | "cog"
  | "moi";

const VIEWS: { id: View; label: string }[] = [
  { id: "thrust_pressure", label: "Thrust & Chamber Pressure" },
  { id: "exit_pressure", label: "Exit Pressure" },
  { id: "efficiency", label: "Efficiency" },
  { id: "losses", label: "Losses" },
  { id: "burn", label: "Burn" },
  { id: "mass_web", label: "Mass & Web" },
  { id: "volumes", label: "Volumes" },
  { id: "thrust_coeff", label: "Thrust Coefficient (Cf)" },
  { id: "mass_flux", label: "Mass Flux per Grain" },
  { id: "cog", label: "Center of Gravity" },
  { id: "moi", label: "Moment of Inertia" },
];

const SERIES_COLORS = [
  "#f97316",
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#ec4899",
  "#06b6d4",
  "#eab308",
  "#ef4444",
];

function downloadCsv(filename: string, rows: Record<string, number>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => row[h] ?? "").join(",")),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Standardised export dimensions. 1920 px wide gives ~6.4" at 300 DPI — a
// good fit for full-width charts in reports and slides. Height is computed
// from the on-screen aspect ratio so the chart doesn't squash.
const EXPORT_WIDTH = 1920;
const EXPORT_BG = "#ffffff";
const EXPORT_TEXT = "#1f2937"; // gray-800
const EXPORT_GRID = "#e5e7eb"; // gray-200
const EXPORT_AXIS = "#9ca3af"; // gray-400
const SVG_NS = "http://www.w3.org/2000/svg";

interface LegendItem {
  color: string;
  label: string;
  textWidth: number;
}

// Recharts renders the legend as plain HTML outside the chart's <svg>, so
// a naive svg.cloneNode() drops it. Read what's in the DOM and rebuild it
// as inline SVG when we compose the export.
function readLegendItems(container: HTMLElement): LegendItem[] {
  return Array.from(container.querySelectorAll(".recharts-legend-item"))
    .map((item) => {
      const swatch = item.querySelector(".recharts-legend-icon");
      const text = item.querySelector<HTMLElement>(
        ".recharts-legend-item-text",
      );
      const label = text?.textContent?.trim() ?? "";
      const color =
        swatch?.getAttribute("fill") ??
        swatch?.getAttribute("stroke") ??
        EXPORT_TEXT;
      // offsetWidth is precise for the actual rendered label; fall back to a
      // rough char-width estimate if Recharts hasn't laid the text out yet.
      const textWidth = text?.offsetWidth ?? Math.max(40, label.length * 7);
      return { color, label, textWidth };
    })
    .filter((it) => it.label.length > 0);
}

function applyExportTheme(svg: SVGSVGElement) {
  // All text → dark, regardless of theme
  svg.querySelectorAll<SVGElement>("text, tspan").forEach((el) => {
    el.style.fill = EXPORT_TEXT;
    el.style.fontFamily = "Helvetica, Arial, sans-serif";
  });
  // Grid lines (className="stroke-border" doesn't resolve outside the page)
  svg
    .querySelectorAll<SVGElement>(
      ".recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line",
    )
    .forEach((el) => {
      el.style.stroke = EXPORT_GRID;
    });
  // Axis lines and tick marks
  svg
    .querySelectorAll<SVGElement>(
      ".recharts-cartesian-axis-line, .recharts-cartesian-axis-tick-line",
    )
    .forEach((el) => {
      el.style.stroke = EXPORT_AXIS;
    });
  // Drop any tooltip cursor / active-dot artefacts left from the user's
  // last hover so they don't appear in the export.
  svg
    .querySelectorAll(".recharts-tooltip-cursor, .recharts-active-dot")
    .forEach((el) => el.parentNode?.removeChild(el));
}

function appendLegend(
  svg: SVGSVGElement,
  items: LegendItem[],
  width: number,
  yBaseline: number,
) {
  const FONT_SIZE = 12;
  const SWATCH_SIZE = 12;
  const SWATCH_TEXT_GAP = 6;
  const ITEM_GAP = 18;

  const itemWidths = items.map(
    (it) =>
      SWATCH_SIZE +
      SWATCH_TEXT_GAP +
      Math.max(it.textWidth, it.label.length * FONT_SIZE * 0.55),
  );
  const totalWidth =
    itemWidths.reduce((a, b) => a + b, 0) +
    ITEM_GAP * Math.max(0, items.length - 1);
  let cursor = Math.max(8, (width - totalWidth) / 2);

  items.forEach((item, i) => {
    const swatch = document.createElementNS(SVG_NS, "rect");
    swatch.setAttribute("x", String(cursor));
    swatch.setAttribute("y", String(yBaseline - SWATCH_SIZE));
    swatch.setAttribute("width", String(SWATCH_SIZE));
    swatch.setAttribute("height", String(SWATCH_SIZE));
    swatch.setAttribute("rx", "2");
    swatch.setAttribute("fill", item.color);
    svg.appendChild(swatch);

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", String(cursor + SWATCH_SIZE + SWATCH_TEXT_GAP));
    label.setAttribute("y", String(yBaseline));
    label.setAttribute("font-size", String(FONT_SIZE));
    label.setAttribute("font-family", "Helvetica, Arial, sans-serif");
    label.setAttribute("fill", EXPORT_TEXT);
    label.textContent = item.label;
    svg.appendChild(label);

    cursor += itemWidths[i] + ITEM_GAP;
  });
}

function exportChartPng(container: HTMLElement | null, filename: string) {
  if (!container) return;
  // Recharts gives the *main* chart surface and every legend swatch the same
  // `recharts-surface` class. Picking by class would match the first one in
  // DOM order, which can be a 14×14 swatch — that's how the export ended up
  // 7954 px tall. Filter by rendered size instead.
  const svg = Array.from(
    container.querySelectorAll<SVGSVGElement>("svg"),
  ).find((s) => {
    const r = s.getBoundingClientRect();
    return r.width >= 100 && r.height >= 100;
  });
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const chartW = Math.round(rect.width);
  const chartH = Math.round(rect.height);
  const legendItems = readLegendItems(container);
  const legendPad = legendItems.length > 0 ? 44 : 0;
  const totalW = chartW;
  const totalH = chartH + legendPad;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", String(totalW));
  clone.setAttribute("height", String(totalH));
  clone.setAttribute("viewBox", `0 0 ${totalW} ${totalH}`);

  applyExportTheme(clone);
  if (legendItems.length > 0) {
    appendLegend(clone, legendItems, totalW, chartH + 26);
  }

  const svgStr = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  const exportW = EXPORT_WIDTH;
  const exportH = Math.round(exportW * (totalH / totalW));

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = exportW;
    canvas.height = exportH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(svgUrl);
      return;
    }
    ctx.fillStyle = EXPORT_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Rasterise the SVG straight at the target size — vector → bitmap stays
    // sharp regardless of how big or small the on-screen chart was.
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(svgUrl);
    canvas.toBlob((blob) => {
      if (blob) triggerDownload(blob, filename);
    }, "image/png");
  };
  img.onerror = () => {
    URL.revokeObjectURL(svgUrl);
  };
  img.src = svgUrl;
}

export function SolidResultsChart({ results }: Props) {
  const [view, setView] = useState<View>("thrust_pressure");
  const chartRef = useRef<HTMLDivElement>(null);

  const grainCount = results.grain_mass_flux.length;

  const data = useMemo(
    () =>
      results.t.map((t, i) => {
        const row: Record<string, number> = {
          t: parseFloat(t.toFixed(4)),
          thrust: parseFloat(results.thrust[i].toFixed(2)),
          P_0_MPa: parseFloat(paToMpa(results.P_0[i]).toFixed(4)),
          P_exit_MPa: parseFloat(paToMpa(results.P_exit[i]).toFixed(4)),
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
          m_prop: parseFloat(results.m_prop[i].toFixed(4)),
          web_mm: parseFloat((results.web[i] * 1000).toFixed(4)),
          propellant_volume_cm3: parseFloat(
            (results.propellant_volume[i] * 1e6).toFixed(4),
          ),
          free_chamber_volume_cm3: parseFloat(
            (results.free_chamber_volume[i] * 1e6).toFixed(4),
          ),
          C_f: parseFloat(results.C_f[i].toFixed(4)),
          C_f_ideal: parseFloat(results.C_f_ideal[i].toFixed(4)),
          cog_x: parseFloat((results.propellant_cog[i]?.[0] ?? 0).toFixed(4)),
          cog_y: parseFloat((results.propellant_cog[i]?.[1] ?? 0).toFixed(4)),
          cog_z: parseFloat((results.propellant_cog[i]?.[2] ?? 0).toFixed(4)),
          moi_xx: parseFloat(
            (results.propellant_moi[i]?.[0]?.[0] ?? 0).toFixed(6),
          ),
          moi_yy: parseFloat(
            (results.propellant_moi[i]?.[1]?.[1] ?? 0).toFixed(6),
          ),
          moi_zz: parseFloat(
            (results.propellant_moi[i]?.[2]?.[2] ?? 0).toFixed(6),
          ),
        };
        for (let g = 0; g < grainCount; g++) {
          row[`grain_${g}`] = parseFloat(
            (results.grain_mass_flux[g]?.[i] ?? 0).toFixed(4),
          );
        }
        return row;
      }),
    [results, grainCount],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold leading-none tracking-tight">
          Time Series
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            title="Export plot as PNG"
            aria-label="Export plot as PNG"
            onClick={() =>
              exportChartPng(
                chartRef.current,
                `simulation_${results.simulation_id}_${view}.png`,
              )
            }
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="Export data as CSV"
            aria-label="Export data as CSV"
            onClick={() =>
              downloadCsv(`simulation_${results.simulation_id}.csv`, data)
            }
          >
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <select
            value={view}
            onChange={(e) => setView(e.target.value as View)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {VIEWS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div ref={chartRef} className="h-[280px] sm:h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
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

            {view === "thrust_pressure" && (
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

            {view === "exit_pressure" && (
              <>
                <YAxis
                  yAxisId="pressure"
                  label={{
                    value: "Exit Pressure (MPa)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                  }}
                  tick={{ fontSize: 11 }}
                />
                <Line
                  yAxisId="pressure"
                  type="monotone"
                  dataKey="P_exit_MPa"
                  stroke="#22c55e"
                  dot={false}
                  name="P_exit (MPa)"
                  strokeWidth={2}
                />
              </>
            )}

            {view === "efficiency" && (
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
                  {
                    key: "nozzle_efficiency",
                    label: "Nozzle",
                    color: "#a855f7",
                  },
                  {
                    key: "overall_efficiency",
                    label: "Overall",
                    color: "#22c55e",
                  },
                ].map(({ key, label, color }) => (
                  <Line
                    key={key}
                    yAxisId="pct"
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    dot={false}
                    name={`${label} (%)`}
                    strokeWidth={2}
                  />
                ))}
              </>
            )}

            {view === "losses" && (
              <>
                <YAxis
                  yAxisId="pct"
                  domain={[0, 105]}
                  label={{
                    value: "Loss Factor (%)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                  }}
                  tick={{ fontSize: 11 }}
                />
                {[
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

            {view === "burn" && (
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

            {view === "mass_web" && (
              <>
                <YAxis
                  yAxisId="mass"
                  orientation="left"
                  label={{
                    value: "Propellant Mass (kg)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                  }}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  yAxisId="web"
                  orientation="right"
                  label={{
                    value: "Web (mm)",
                    angle: 90,
                    position: "insideRight",
                    offset: 12,
                  }}
                  tick={{ fontSize: 11 }}
                />
                <Line
                  yAxisId="mass"
                  type="monotone"
                  dataKey="m_prop"
                  stroke="#f97316"
                  dot={false}
                  name="m_prop (kg)"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="web"
                  type="monotone"
                  dataKey="web_mm"
                  stroke="#3b82f6"
                  dot={false}
                  name="Web (mm)"
                  strokeWidth={2}
                />
              </>
            )}

            {view === "volumes" && (
              <>
                <YAxis
                  yAxisId="vol"
                  label={{
                    value: "Volume (cm³)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                  }}
                  tick={{ fontSize: 11 }}
                />
                <Line
                  yAxisId="vol"
                  type="monotone"
                  dataKey="propellant_volume_cm3"
                  stroke="#f97316"
                  dot={false}
                  name="Propellant Vol. (cm³)"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="vol"
                  type="monotone"
                  dataKey="free_chamber_volume_cm3"
                  stroke="#3b82f6"
                  dot={false}
                  name="Free Chamber Vol. (cm³)"
                  strokeWidth={2}
                />
              </>
            )}

            {view === "thrust_coeff" && (
              <>
                <YAxis
                  yAxisId="cf"
                  label={{
                    value: "Cf (-)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                  }}
                  tick={{ fontSize: 11 }}
                />
                <Line
                  yAxisId="cf"
                  type="monotone"
                  dataKey="C_f"
                  stroke="#f97316"
                  dot={false}
                  name="Cf"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="cf"
                  type="monotone"
                  dataKey="C_f_ideal"
                  stroke="#3b82f6"
                  dot={false}
                  name="Cf (ideal)"
                  strokeWidth={2}
                />
              </>
            )}

            {view === "mass_flux" && (
              <>
                <YAxis
                  yAxisId="flux"
                  label={{
                    value: "Mass Flux (kg/s/m²)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                  }}
                  tick={{ fontSize: 11 }}
                />
                {Array.from({ length: grainCount }, (_, g) => (
                  <Line
                    key={g}
                    yAxisId="flux"
                    type="monotone"
                    dataKey={`grain_${g}`}
                    stroke={SERIES_COLORS[g % SERIES_COLORS.length]}
                    dot={false}
                    name={`Grain ${g}`}
                    strokeWidth={1.5}
                  />
                ))}
              </>
            )}

            {view === "cog" && (
              <>
                <YAxis
                  yAxisId="cog"
                  label={{
                    value: "Position (m)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                  }}
                  tick={{ fontSize: 11 }}
                />
                <Line
                  yAxisId="cog"
                  type="monotone"
                  dataKey="cog_x"
                  stroke="#f97316"
                  dot={false}
                  name="x (m)"
                  strokeWidth={1.5}
                />
                <Line
                  yAxisId="cog"
                  type="monotone"
                  dataKey="cog_y"
                  stroke="#3b82f6"
                  dot={false}
                  name="y (m)"
                  strokeWidth={1.5}
                />
                <Line
                  yAxisId="cog"
                  type="monotone"
                  dataKey="cog_z"
                  stroke="#22c55e"
                  dot={false}
                  name="z (m)"
                  strokeWidth={1.5}
                />
              </>
            )}

            {view === "moi" && (
              <>
                <YAxis
                  yAxisId="moi"
                  label={{
                    value: "MOI (kg·m²)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                  }}
                  tick={{ fontSize: 11 }}
                />
                <Line
                  yAxisId="moi"
                  type="monotone"
                  dataKey="moi_xx"
                  stroke="#f97316"
                  dot={false}
                  name="Ixx"
                  strokeWidth={1.5}
                />
                <Line
                  yAxisId="moi"
                  type="monotone"
                  dataKey="moi_yy"
                  stroke="#3b82f6"
                  dot={false}
                  name="Iyy"
                  strokeWidth={1.5}
                />
                <Line
                  yAxisId="moi"
                  type="monotone"
                  dataKey="moi_zz"
                  stroke="#22c55e"
                  dot={false}
                  name="Izz"
                  strokeWidth={1.5}
                />
              </>
            )}

            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value) =>
                typeof value === "number"
                  ? value.toFixed(4)
                  : String(value ?? "")
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
