export type Language = "es" | "en";
export type Theme = "light" | "dark";
export type Preferences = { language: Language; theme: Theme };

export const PREFERENCES_KEY = "trackflow.preferences";
export const DEFAULT_PREFERENCES: Preferences = { language: "es", theme: "light" };
const listeners = new Set<() => void>();
let current: Preferences = DEFAULT_PREFERENCES;
let initialized = false;

export function parsePreferences(value: string | null): Preferences {
  try {
    const parsed: unknown = JSON.parse(value ?? "null");
    if (!parsed || typeof parsed !== "object") return DEFAULT_PREFERENCES;
    const preferences = parsed as Partial<Preferences>;
    return {
      language: preferences.language === "en" ? "en" : "es",
      theme: preferences.theme === "dark" ? "dark" : "light",
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function getServerPreferences(): Preferences {
  return DEFAULT_PREFERENCES;
}

export function getPreferences(): Preferences {
  if (!initialized && typeof window !== "undefined") {
    initialized = true;
    try { current = parsePreferences(window.localStorage.getItem(PREFERENCES_KEY)); }
    catch { current = DEFAULT_PREFERENCES; }
  }
  return current;
}

export function setPreferences(update: Partial<Preferences>): void {
  current = { ...getPreferences(), ...update };
  try { window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(current)); }
  catch {}
  listeners.forEach((listener) => listener());
}

export function subscribePreferences(listener: () => void): () => void {
  listeners.add(listener);
  function onStorage(event: StorageEvent) {
    if (event.key !== PREFERENCES_KEY && event.key !== null) return;
    current = parsePreferences(event.newValue);
    listeners.forEach((notify) => notify());
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}