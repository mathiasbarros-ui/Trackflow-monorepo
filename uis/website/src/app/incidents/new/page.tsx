"use client";

import { usePreferences } from "@/components/Preferences";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { RequireSession, responseError, useSession } from "@/components/SessionProvider";

function IncidentForm() {
  const { t } = usePreferences();
  const { request } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [incidentId, setIncidentId] = useState<number | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await request("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(data.get("title")).trim(),
          description: String(data.get("description")).trim(),
          category: data.get("category"),
          branch: data.get("branch"),
          origin: "customer",
          status: "open",
        }),
      });
      if (!response.ok) throw new Error(await responseError(response, "No se pudo registrar la incidencia."));
      const incident: { id: number } = await response.json();
      setIncidentId(incident.id);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo conectar con el servidor.");
    } finally { setBusy(false); }
  }

  return (
    <main className="container section form-width">
      <p className="eyebrow">{t("TE ESCUCHAMOS")}</p><h1>{t("Contanos qué sucede.")}</h1>
      <p className="muted">{t("Cada detalle nos ayuda a entender el problema y encontrar una solución.")}</p>
      {incidentId !== null ? (
        <section className="panel confirmation" aria-live="polite">
          <span className="confirmation-icon" aria-hidden="true">✓</span>
          <h2>{t("Tu incidencia ya está registrada.")}</h2>
          <p>{t("Número de referencia ")}<strong>#{incidentId}</strong>{t(". Nuestro equipo podrá verla en su panel.")}</p>
          <button className="button" onClick={() => setIncidentId(null)}>{t("Crear otra incidencia ↗")}</button>
          <Link className="text-link" href="/">{t("Volver al inicio")}</Link>
        </section>
      ) : (
        <form className="panel form-grid" onSubmit={submit}>
          <label>{t("Título")}<input name="title" placeholder={t("Resumí lo que pasó")} required maxLength={200} /></label>
          <div className="form-columns">
            <label>{t("Categoría")}<select name="category" required defaultValue=""><option value="" disabled>{t("Seleccioná una categoría")}</option><option value="pagos">{t("Pagos")}</option><option value="sistema">{t("Sistema")}</option><option value="pedidos">{t("Pedidos")}</option><option value="atencion_cliente">{t("Atención al cliente")}</option><option value="infraestructura">{t("Infraestructura")}</option></select></label>
            <label>{t("Sucursal")}<select name="branch" required defaultValue=""><option value="" disabled>{t("Seleccioná una sucursal")}</option><option value="central">{t("Central")}</option><option value="sucursal_norte">{t("Sucursal norte")}</option><option value="sucursal_centro">{t("Sucursal centro")}</option><option value="sucursal_sur">{t("Sucursal sur")}</option></select></label>
          </div>
          <label>{t("¿Qué pasó?")}<textarea name="description" rows={6} placeholder={t("Incluí los detalles necesarios para que podamos ayudarte. No compartas contraseñas ni datos de pago.")} required maxLength={5000} /></label>
          <p className="field-help">{t("La incidencia quedará asociada a tu cuenta y se enviará al equipo de TrackFlow.")}</p>
          {error ? <p className="notice error" role="alert">{t(error)}</p> : null}
          <button className="button" disabled={busy}>{busy ? t("Registrando...") : t("Enviar incidencia ↗")}</button>
        </form>
      )}
    </main>
  );
}

export default function NewIncidentPage() {
  return <RequireSession><IncidentForm /></RequireSession>;
}
