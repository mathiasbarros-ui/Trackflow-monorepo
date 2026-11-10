"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/hooks/useAuth";
import { PreferencesRoot } from "@/hooks/usePreferences";

export default function Providers({ children }: { children: ReactNode }) {
  return <PreferencesRoot><AuthProvider>{children}</AuthProvider></PreferencesRoot>;
}
