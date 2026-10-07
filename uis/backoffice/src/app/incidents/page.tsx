"use client";

import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";


type IncidentStatus = "open" | "in_progress" | "resolved" | "discarded";
type IncidentOrigin = "customer" | "branch" | "internal";
type IncidentCategory = "pagos" | "sistema" | "pedidos" | "atencion_cliente" | "infraestructura";
type IncidentBranch = "central" | "sucursal_norte" | "sucursal_centro" | "sucursal_sur";

type Incident = {
  id: number;
  title: string;
  description: string;
  category: IncidentCategory;
  status: IncidentStatus;
  origin: IncidentOrigin;
  branch: IncidentBranch;
  reported_by_user_id: string | null;
  legacy_id: string | null;
  created_at: string;
  updated_at: string;
};

type IncidentSummary = {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_origin: Record<string, number>;
  by_branch: Record<string, number>;
};

type IncidentForm = {
  title: string;
  description: string;
  category: IncidentCategory;
  status: IncidentStatus;
  origin: IncidentOrigin;
  branch: IncidentBranch;
};

const STATUS_OPTIONS: IncidentStatus[] = ["open", "in_progress", "resolved", "discarded"];
const ORIGIN_OPTIONS: IncidentOrigin[] = ["customer", "branch", "internal"];
const CATEGORY_OPTIONS: IncidentCategory[] = [
  "pagos",
  "sistema",
  "pedidos",
  "atencion_cliente",
  "infraestructura",
];
const BRANCH_OPTIONS: IncidentBranch[] = ["central", "sucursal_norte", "sucursal_centro", "sucursal_sur"];

const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: "Abierta",
  in_progress: "En curso",
  resolved: "Resuelta",
  discarded: "Descartada",
};

const ORIGIN_LABELS: Record<IncidentOrigin, string> = {
  customer: "Cliente",
  branch: "Sucursal",
  internal: "Equipo interno",
};

const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  pagos: "Pagos",
  sistema: "Sistema",
  pedidos: "Pedidos",
  atencion_cliente: "Atencion al cliente",
  infraestructura: "Infraestructura",
};

const BRANCH_LABELS: Record<IncidentBranch, string> = {
  central: "Central",
  sucursal_norte: "Sucursal norte",
  sucursal_centro: "Sucursal centro",
  sucursal_sur: "Sucursal sur",
};

const NEXT_STATUS: Partial<Record<IncidentStatus, IncidentStatus[]>> = {
  open: ["in_progress", "discarded"],
  in_progress: ["resolved", "discarded"],
};

const initialForm: IncidentForm = {
  title: "",
  description: "",
  category: "pagos",
  status: "open",
  origin: "customer",
  branch: "central",
};


export default function IncidentsPage() {
  const { authFetch } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | IncidentStatus>("");
  const [originFilter, setOriginFilter] = useState<"" | IncidentOrigin>("");
  const [branchFilter, setBranchFilter] = useState<"" | IncidentBranch>("");
  const [categoryFilter, setCategoryFilter] = useState<"" | IncidentCategory>("");
  const [form, setForm] = useState<IncidentForm>(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadIncidents();
  }, [statusFilter, originFilter, branchFilter, categoryFilter]);

  async function loadIncidents() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (originFilter) params.set("origin", originFilter);
      if (branchFilter) params.set("branch", branchFilter);
      if (categoryFilter) params.set("category", categoryFilter);

      const queryString = params.toString();
      const incidentsUrl = queryString
        ? `/backend/api/incidents?${queryString}`
        : "/backend/api/incidents";

      const [incidentsResponse, summaryResponse] = await Promise.all([
        authFetch(incidentsUrl, { method: "GET" }),
        authFetch("/backend/api/incidents/summary", { method: "GET" }),
      ]);

      const incidentsData = (await incidentsResponse.json().catch(() => null)) as Incident[] | { detail?: string } | null;
      const summaryData = (await summaryResponse.json().catch(() => null)) as IncidentSummary | { detail?: string } | null;

      if (!incidentsResponse.ok) {
        throw new Error((incidentsData as { detail?: string })?.detail ?? "No se pudieron cargar incidencias");
      }

      if (!summaryResponse.ok) {
        throw new Error((summaryData as { detail?: string })?.detail ?? "No se pudo cargar el resumen");
      }

      setIncidents(incidentsData as Incident[]);
      setSummary(summaryData as IncidentSummary);
    } catch (loadError) {
      if (loadError instanceof Error) {
        setError(loadError.message);
      } else {
        setError("Error inesperado al cargar incidencias");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      const response = await authFetch("/backend/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail?.message ?? data?.detail ?? "No se pudo crear incidencia");
      }

      setForm(initialForm);
      await loadIncidents();
    } catch (createError) {
      if (createError instanceof Error) {
        setError(createError.message);
      } else {
        setError("Error inesperado al crear incidencia");
      }
    }
  }

  async function updateIncidentStatus(incidentId: number, status: IncidentStatus) {
    setError("");

    try {
      const response = await authFetch(`/backend/api/incidents/${incidentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail?.message ?? data?.detail ?? "No se pudo actualizar estado");
      }

      await loadIncidents();
    } catch (statusError) {
      if (statusError instanceof Error) {
        setError(statusError.message);
      } else {
        setError("Error inesperado al actualizar estado");
      }
    }
  }

  return (
    <main className="container">
      <section className="pageHeader">
        <h1>Gestor de incidencias</h1>
        <p>Registra, filtra y actualiza incidencias operativas por origen, sucursal y categoria.</p>
      </section>

      {summary ? (
        <section className="metrics incidentMetrics">
          <div className="metric">
            <span>Total</span>
            <strong>{summary.total}</strong>
          </div>
          <div className="metric">
            <span>Abiertas</span>
            <strong>{summary.by_status.open ?? 0}</strong>
          </div>
          <div className="metric">
            <span>En curso</span>
            <strong>{summary.by_status.in_progress ?? 0}</strong>
          </div>
          <div className="metric">
            <span>Resueltas</span>
            <strong>{summary.by_status.resolved ?? 0}</strong>
          </div>
        </section>
      ) : null}

      <section className="card">
        <h2>Nueva incidencia</h2>
        <form className="incidentForm" onSubmit={handleCreateIncident}>
          <input
            type="text"
            placeholder="Titulo"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />

          <textarea
            placeholder="Descripcion"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            required
          />

          <select
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as IncidentCategory }))}
          >
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>

          <select
            value={form.origin}
            onChange={(event) => setForm((prev) => ({ ...prev, origin: event.target.value as IncidentOrigin }))}
          >
            {ORIGIN_OPTIONS.map((origin) => (
              <option key={origin} value={origin}>
                {ORIGIN_LABELS[origin]}
              </option>
            ))}
          </select>

          <select
            value={form.branch}
            onChange={(event) => setForm((prev) => ({ ...prev, branch: event.target.value as IncidentBranch }))}
          >
            {BRANCH_OPTIONS.map((branch) => (
              <option key={branch} value={branch}>
                {BRANCH_LABELS[branch]}
              </option>
            ))}
          </select>

          <button type="submit">Crear incidencia</button>
        </form>
      </section>

      <section className="card">
        <h2>Filtros</h2>
        <div className="incidentFilters">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | IncidentStatus)}>
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map((incidentStatus) => (
              <option key={incidentStatus} value={incidentStatus}>
                {STATUS_LABELS[incidentStatus]}
              </option>
            ))}
          </select>

          <select value={originFilter} onChange={(event) => setOriginFilter(event.target.value as "" | IncidentOrigin)}>
            <option value="">Todos los origenes</option>
            {ORIGIN_OPTIONS.map((origin) => (
              <option key={origin} value={origin}>
                {ORIGIN_LABELS[origin]}
              </option>
            ))}
          </select>

          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value as "" | IncidentBranch)}>
            <option value="">Todas las sucursales</option>
            {BRANCH_OPTIONS.map((branch) => (
              <option key={branch} value={branch}>
                {BRANCH_LABELS[branch]}
              </option>
            ))}
          </select>

          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as "" | IncidentCategory)}>
            <option value="">Todas las categorias</option>
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="card">
        <h2>Listado</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : incidents.length === 0 ? (
          <p>No hay incidencias.</p>
        ) : (
          <ul className="incidentList">
            {incidents.map((incident) => (
              <li key={incident.id} className="incidentRow">
                <div>
                  <strong>{incident.title}</strong>
                  <p>{incident.description}</p>
                  <div className="incidentMeta">
                    {BRANCH_LABELS[incident.branch]} · {ORIGIN_LABELS[incident.origin]} · {CATEGORY_LABELS[incident.category]}
                  </div>
                  <span className={`statusBadge incidentStatus-${incident.status}`}>
                    {STATUS_LABELS[incident.status]}
                  </span>
                </div>

                <div className="incidentActions">
                  {(NEXT_STATUS[incident.status] ?? []).map((nextStatus) => (
                    <button key={nextStatus} type="button" onClick={() => void updateIncidentStatus(incident.id, nextStatus)}>
                      Pasar a {STATUS_LABELS[nextStatus].toLowerCase()}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}