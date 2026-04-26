import type { Metadata } from "next";
import MotorDetailClient from "./MotorDetailClient";

export const metadata: Metadata = {
  title: "motor",
};

export function generateStaticParams() {
  return [];
}

export default function MotorDetailPage() {
  return <MotorDetailClient />;
}
