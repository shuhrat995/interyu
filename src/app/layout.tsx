import type { Metadata } from "next";
import VisitTracker from "@/components/VisitTracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Intervyu — Bilim sinash platformasi",
  description: "Adaptiv AI intervyu: bilimingizni sinab ko'ring, darajangizni aniqlang."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>
        <VisitTracker />
        {children}
      </body>
    </html>
  );
}
