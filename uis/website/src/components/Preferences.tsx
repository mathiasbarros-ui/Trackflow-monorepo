"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { getPreferences, getServerPreferences, setPreferences, subscribePreferences } from "../../../shared/preferences";
import { translate } from "../../../shared/translations";

export function usePreferences() {
  const preferences = useSyncExternalStore(subscribePreferences, getPreferences, getServerPreferences);
  return { ...preferences, setPreferences, t: (text: string, values?: Record<string, string | number>) => translate(preferences.language, text, values) };
}

export function PreferencesRoot({ children }: { children: ReactNode }) {
  const { language, theme } = usePreferences();
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [language, theme]);
  return children;
}