import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STOCKLE",
  description: "Adivina la acción del día — Financial Puzzle",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
