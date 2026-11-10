"use client";

import { usePreferences } from "@/components/Preferences";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useSession } from "./SessionProvider";

export default function AccessForm({ register = false }: { register?: boolean }) {
  const { t } = usePreferences();
  const { signIn, signUp } = useSession();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const email = String(data.get("email")).trim();
      const password = String(data.get("password"));
      if (register) await signUp(email, password, String(data.get("name")).trim());
      else await signIn(email, password);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo conectar con el servidor.");
    } finally { setBusy(false); }
  }

  return (
    <main className="container section narrow">
      <p className="eyebrow">{t("BIENVENIDO A TRACKFLOW")}</p>
      <h1>{register ? t("Empezá a fluir.") : t("Qué bueno verte.")}</h1>
      <p className="muted">{register ? t("Creá tu cuenta para reportar incidencias y conectar con nuestro equipo.") : t("Ingresá a tu espacio. Si sos administrador, te llevaremos al backoffice.")}</p>
      <form className="panel form-grid" onSubmit={submit}>
        {register ? <label>{t("Tu nombre")}<input name="name" autoComplete="name" maxLength={120} required /></label> : null}
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>{t("Contraseña")}<input name="password" type="password" minLength={register ? 8 : undefined} maxLength={72} autoComplete={register ? "new-password" : "current-password"} required /></label>
        {register ? <p className="field-help">{t("Usá entre 8 y 72 caracteres.")}</p> : null}
        {error ? <p className="notice error" role="alert">{t(error)}</p> : null}
        <button className="button" disabled={busy}>{busy ? t("Conectando...") : register ? t("Crear mi cuenta ↗") : t("Iniciar sesión ↗")}</button>
      </form>
      <p className="form-footnote">{register ? t("¿Ya tenés cuenta? ") : t("¿Todavía no tenés cuenta? ")}<Link href={register ? "/login" : "/register"}>{register ? t("Iniciá sesión") : t("Registrate")}</Link></p>
      {!register ? <a className="text-link" href={`${process.env.NEXT_PUBLIC_BACKOFFICE_URL ?? "http://localhost:3001"}/forgot-password`}>{t("¿Olvidaste tu contraseña?")}</a> : null}
    </main>
  );
}
