import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PREFERENCES, PREFERENCES_KEY, getPreferences, getServerPreferences, parsePreferences, setPreferences, subscribePreferences } from "./preferences.ts";
import { translate } from "./translations.ts";

test("translations preserve Spanish, unknown data, spacing and interpolation values", () => {
  assert.equal(translate("es", "Mi perfil"), "Mi perfil");
  assert.equal(translate("en", "Mi perfil"), "My profile");
  assert.equal(translate("en", " ¿Ya tenés cuenta? "), " Already have an account? ");
  assert.equal(translate("en", "Customer supplied text"), "Customer supplied text");
  assert.equal(translate("en", "¿Guardar los permisos de {email}?", { email: "test@example.com" }), "Save permissions for test@example.com?");
});

test("preferences default to Spanish and light mode and reject malformed values", () => {
  for (const value of [null, "invalid", "null", "42", '{"language":"fr","theme":"blue"}']) {
    assert.deepEqual(parsePreferences(value), DEFAULT_PREFERENCES);
  }
  assert.deepEqual(parsePreferences('{"language":"en","theme":"dark"}'), { language: "en", theme: "dark" });
  assert.equal(getServerPreferences(), DEFAULT_PREFERENCES);
});

test("preferences persist, notify subscribers, sync tabs and tolerate blocked storage", () => {
  const storage = new Map([[PREFERENCES_KEY, '{"language":"en","theme":"light"}']]);
  const events = new EventTarget();
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  try {
    assert.equal(getPreferences().language, "en");
    assert.equal(getPreferences(), getPreferences());
    let updates = 0;
    const unsubscribe = subscribePreferences(() => { updates += 1; });
    setPreferences({ theme: "dark" });
    assert.deepEqual(JSON.parse(storage.get(PREFERENCES_KEY)), { language: "en", theme: "dark" });
    assert.equal(updates, 1);
    const event = new Event("storage");
    Object.assign(event, { key: PREFERENCES_KEY, newValue: '{"language":"es","theme":"dark"}' });
    events.dispatchEvent(event);
    assert.equal(getPreferences().language, "es");
    window.localStorage.setItem = () => { throw new Error("Blocked"); };
    assert.doesNotThrow(() => setPreferences({ language: "en" }));
    assert.equal(getPreferences().language, "en");
    unsubscribe();
  } finally {
    delete globalThis.window;
  }
});