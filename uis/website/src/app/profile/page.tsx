"use client";

import { useState, type FormEvent } from "react";
import { RequireSession, responseError, useSession } from "@/components/SessionProvider";
import { usePreferences } from "@/components/Preferences";

function ProfileForm() {
  const { user, request, refresh } = useSession();
  const { theme, language, setPreferences, t } = usePreferences();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await request("/profiles/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name")).trim(),
          phone: String(data.get("phone")).trim(),
          address: String(data.get("address")).trim(),
        }),
      });
      if (!response.ok) throw new Error(await responseError(response, "No se pudo guardar tu perfil."));
      if (!await response.json()) throw new Error("No se encontró tu perfil. Contactá al administrador.");
      await refresh();
      setMessage("Tu perfil se actualizó correctamente.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo conectar con el servidor.");
    } finally { setBusy(false); }
  }

  return (
    <main className="container section narrow">
      <p className="eyebrow">{t("TU ESPACIO")}</p><h1>{t("Un poco más de vos.")}</h1>
      <p className="muted">{t("Mantené tus datos actualizados para que podamos ayudarte mejor.")}</p>
      <section className="preferences" aria-labelledby="preferences-heading">
        <h2 id="preferences-heading">{t("Preferencias")}</h2>
        <label className="preference-row">
          <span>{t("Modo oscuro")}</span>
          <input className="theme-switch" type="checkbox" role="switch" checked={theme === "dark"} onChange={(event) => setPreferences({ theme: event.target.checked ? "dark" : "light" })} />
        </label>
        <label className="preference-row">
          <span id="language-label">{t("Idioma")}</span>
          <select aria-labelledby="language-label" value={language} onChange={(event) => setPreferences({ language: event.target.value === "en" ? "en" : "es" })}>
            <option value="es" lang="es">Español</option>
            <option value="en" lang="en">English</option>
          </select>
        </label>
      </section>
      <form className="panel form-grid" onSubmit={save}>
        <label>Email<input value={user?.email ?? ""} readOnly type="email" /></label>
        <label>{t("Nombre")}<input name="name" defaultValue={user?.profile?.name ?? ""} autoComplete="name" maxLength={120} required /></label>
        <label>{t("Teléfono")}<input name="phone" type="tel" defaultValue={user?.profile?.phone ?? ""} autoComplete="tel" maxLength={40} /></label>
        <label>{t("Dirección")}<input name="address" defaultValue={user?.profile?.address ?? ""} autoComplete="street-address" maxLength={250} /></label>
        {error ? <p className="notice error" role="alert">{t(error)}</p> : null}
        {message ? <p className="notice success" role="status">{t(message)}</p> : null}
        <button className="button" disabled={busy}>{busy ? t("Guardando...") : t("Guardar cambios ↗")}</button>
      </form>
    </main>
  );
}

export default function ProfilePage() {
  return <RequireSession><ProfileForm /></RequireSession>;
}
