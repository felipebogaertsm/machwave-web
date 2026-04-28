/**
 * Motor-type registry — single source of truth for every "create a motor"
 * entry point in the UI (sidebar accordion, dashboard dropdown, /motors/new
 * chooser, /motors page CTA).
 *
 * Plugging in a new engine type
 * -----------------------------
 *   1. Add an entry below with `comingSoon: true` while the wizard is being
 *      built. The UI will render it disabled with a yellow tag everywhere.
 *   2. When the wizard is ready, drop `comingSoon` and set `href` to the
 *      wizard route (mirror the existing `/motors/new/<id>` convention).
 *
 * The `id` field doubles as the URL slug AND the API discriminator
 * (`motor_type`) — keep them in sync with backend schemas.
 */
export type MotorTypeOption =
  | {
      id: string;
      label: string;
      description: string;
      href: string;
      comingSoon?: false;
    }
  | {
      id: string;
      label: string;
      description: string;
      href?: undefined;
      comingSoon: true;
    };

export const MOTOR_TYPES: MotorTypeOption[] = [
  {
    id: "solid",
    label: "Solid Propellant",
    description: "BATES-grain solid rocket motor with a single propellant.",
    href: "/motors/new/solid",
  },
  {
    id: "liquid",
    label: "Biliquid Propellant",
    description:
      "Bipropellant liquid rocket engine with pressure-fed feed system.",
    comingSoon: true,
  },
];
