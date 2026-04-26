import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "new motor",
};

export default function NewMotorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
