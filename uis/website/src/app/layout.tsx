import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "../../../shared/preferences.css";
import SessionProvider from "@/components/SessionProvider";
import { PreferencesRoot } from "@/components/Preferences";

export const metadata: Metadata = {
  title: "TrackFlow",
  description: "Gestión de almacenes y última milla para marcas de e-commerce. TrackFlow opera en Los Ángeles y Zaragoza, desde el inventario hasta la entrega final.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body><PreferencesRoot><SessionProvider>{children}</SessionProvider></PreferencesRoot></body>
    </html>
  );
}
