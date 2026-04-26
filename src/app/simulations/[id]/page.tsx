import type { Metadata } from "next";
import SimulationClient from "./SimulationClient";

export const metadata: Metadata = {
  title: "simulation",
};

export function generateStaticParams() {
  return [];
}

export default function SimulationPage() {
  return <SimulationClient />;
}
