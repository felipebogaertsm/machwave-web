"use client";

import type { SolidMotorForm } from "@/lib/validations";

interface Props {
  data: SolidMotorForm;
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function ReviewStep({ data }: Props) {
  const { name, config } = data;
  const segs = config.grain.segments;
  const nozzle = config.thrust_chamber.nozzle;
  const chamber = config.thrust_chamber.combustion_chamber;

  return (
    <div className="space-y-6 text-sm">
      <h3 className="text-lg font-semibold">Review</h3>

      <section className="space-y-1">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
          Motor
        </h4>
        <Row label="Name" value={name} />
        <Row label="Propellant" value={config.propellant_id} />
      </section>

      <section className="space-y-1">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
          Grain ({segs.length} segment{segs.length !== 1 ? "s" : ""})
        </h4>
        {segs.map((seg, i) => (
          <div key={i} className="rounded-md border p-2 space-y-1">
            <p className="font-medium text-xs">Segment {i + 1}</p>
            <Row label="OD" value={`${seg.outer_diameter} mm`} />
            <Row label="Core" value={`${seg.core_diameter} mm`} />
            <Row label="Length" value={`${seg.length} mm`} />
            <Row label="Density Ratio" value={`${seg.density_ratio}%`} />
          </div>
        ))}
        <Row label="Spacing" value={`${config.grain.spacing} mm`} />
      </section>

      <section className="space-y-1">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
          Nozzle
        </h4>
        <Row label="Throat Ø" value={`${nozzle.throat_diameter} mm`} />
        <Row label="Expansion ratio" value={nozzle.expansion_ratio} />
        <Row label="Divergent angle" value={`${nozzle.divergent_angle}°`} />
      </section>

      <section className="space-y-1">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
          Chamber
        </h4>
        <Row label="Inner Ø" value={`${chamber.casing_inner_diameter} mm`} />
        <Row label="Length" value={`${chamber.internal_length} mm`} />
        <Row label="Dry mass" value={`${config.thrust_chamber.dry_mass} kg`} />
      </section>
    </div>
  );
}
