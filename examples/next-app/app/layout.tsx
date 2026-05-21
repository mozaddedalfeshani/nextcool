import type { ReactNode } from "react";

export const metadata = {
  title: "nextcool fixture",
  description: "Minimal Next.js app for dogfooding nextcool ci.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
