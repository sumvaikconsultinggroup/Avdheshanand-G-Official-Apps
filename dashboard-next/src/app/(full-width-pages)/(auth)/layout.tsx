import { ThemeProvider } from "@/context/ThemeContext";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The signin page renders its own full-screen two-panel design,
  // so this layout is just a full-bleed passthrough.
  return (
    <ThemeProvider>
      <div className="relative min-h-screen w-full">{children}</div>
    </ThemeProvider>
  );
}
