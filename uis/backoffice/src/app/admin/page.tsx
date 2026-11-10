"use client";

import { usePreferences } from "@/hooks/usePreferences";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import styles from "./page.module.css";

type Account = {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};
type LoginAttempt = {
  id: number;
  email: string;
  user_id: string | null;
  succeeded: boolean;
  method: string;
  created_at: string;
};
type Results<T> = { items: T[]; total: number };
const PAGE_SIZE = 25;
const ROLES: Record<string, string> = {
  user: "Usuario", manager: "Manager", admin: "Administrador", superadmin: "Superadmin",
};

async function errorMessage(response: Response) {
  const body: unknown = await response.json();
  if (typeof body === "object" && body !== null && "detail" in body && typeof body.detail === "string") {
    return body.detail;
  }
  return `No se pudo completar la operación (HTTP ${response.status}).`;
}

function AccountControls({ account, save, busy }: {
  account: Account;
  save: (account: Account, role: string, active: boolean) => Promise<void>;
  busy: boolean;
}) {
  const { t } = usePreferences();
  const [role, setRole] = useState(account.role);
  const [active, setActive] = useState(account.is_active);
  if (account.role === "superadmin") return <span className={styles.muted}>{t("Protegido · solo servidor")}</span>;
  const changed = role !== account.role || active !== account.is_active;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (window.confirm(t("¿Guardar los permisos de {email}?", { email: account.email }) + (!active ? ` ${t("La cuenta no podrá acceder a la aplicación.")}` : ""))) {
      void save(account, role, active);
    }
  }
  return (
    <form className={styles.controls} onSubmit={submit}>
      <label>
        <span className={styles.muted}>{t("Rol de ")}{account.email}</span>
        <select value={role} onChange={(event) => setRole(event.target.value)} disabled={busy}>
          <option value="user">{t("Usuario")}</option>
          <option value="manager">Manager</option>
          <option value="admin">{t("Administrador")}</option>
        </select>
      </label>
      <label className={styles.checkbox}>
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} disabled={busy} />{t(" Cuenta activa ")}</label>
      <button disabled={!changed || busy} type="submit">{busy ? t("Guardando...") : t("Guardar cambios")}</button>
    </form>
  );
}

function ManagementPanel() {
  const { t, language } = usePreferences();
  const { authFetch } = useAuth();
  const [tab, setTab] = useState<"users" | "history">("users");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [state, setState] = useState("");
  const [result, setResult] = useState("");
  const [offset, setOffset] = useState(0);
  const [accounts, setAccounts] = useState<Results<Account>>({ items: [], total: 0 });
  const [history, setHistory] = useState<Results<LoginAttempt>>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE) });
      if (query) params.set("search", query);
      if (tab === "users") {
        if (role) params.set("role", role);
        if (state) params.set("is_active", state);
      } else if (result) params.set("succeeded", result);
      try {
        const response = await authFetch(`/admin/${tab === "users" ? "users" : "login-history"}?${params}`);
        if (!response.ok) throw new Error(await errorMessage(response));
        if (tab === "users") {
          const data: Results<Account> = await response.json();
          if (active) setAccounts(data);
        } else {
          const data: Results<LoginAttempt> = await response.json();
          if (active) setHistory(data);
        }
      } catch (failure) {
        if (active) setError(failure instanceof Error ? failure.message : "No se pudo cargar el panel.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [authFetch, offset, query, result, role, state, tab, version]);

  const save = useCallback(async (account: Account, nextRole: string, isActive: boolean) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await authFetch(`/admin/users/${encodeURIComponent(account.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole, is_active: isActive }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setSuccess(account.email);
      setVersion((previous) => previous + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudieron guardar los permisos.");
    } finally { setBusy(false); }
  }, [authFetch]);

  const total = tab === "users" ? accounts.total : history.total;
  return (
    <main className="container">
      <header className="pageHeader">
        <h1>{t("Usuarios y accesos")}</h1>
        <p>{t("Área exclusiva del superadmin. Administrá roles, estados de cuenta e intentos de inicio de sesión.")}</p>
      </header>
      <div className={styles.tabs} role="group" aria-label={t("Sección de administración")}>
        <button aria-pressed={tab === "users"} disabled={busy} onClick={() => { setTab("users"); setOffset(0); setSuccess(""); }}>{t("Usuarios")}</button>
        <button aria-pressed={tab === "history"} disabled={busy} onClick={() => { setTab("history"); setOffset(0); setSuccess(""); }}>{t("Historial de conexiones")}</button>
      </div>
      <section className="card">
        <h2>{tab === "users" ? t("Gestión de cuentas") : t("Intentos de inicio de sesión")}</h2>
        <p>{tab === "users"
          ? t("Podés asignar o quitar el rol de administrador y activar o desactivar cuentas. Los superadmins se asignan desde el servidor.")
          : t("Accesos exitosos y fallidos desde que se habilitó el registro, incluidos los de Swagger. No representa usuarios conectados en tiempo real.")}</p>
        <form className={styles.filters} onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setOffset(0); }}>
          <label>{t("Buscar por email")}<input type="search" value={search} maxLength={320} onChange={(event) => setSearch(event.target.value)} /></label>
          {tab === "users" ? (
            <>
              <label>{t("Rol")}<select value={role} onChange={(event) => { setRole(event.target.value); setOffset(0); }}>
                <option value="">{t("Todos los roles")}</option>
                {Object.entries(ROLES).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
              </select></label>
              <label>{t("Estado")}<select value={state} onChange={(event) => { setState(event.target.value); setOffset(0); }}>
                <option value="">{t("Todos los estados")}</option><option value="true">{t("Activos")}</option><option value="false">{t("Inactivos")}</option>
              </select></label>
            </>
          ) : <label>{t("Resultado")}<select value={result} onChange={(event) => { setResult(event.target.value); setOffset(0); }}>
            <option value="">{t("Todos los resultados")}</option><option value="true">{t("Exitosos")}</option><option value="false">{t("Fallidos")}</option>
          </select></label>}
          <button type="submit" disabled={busy}>{t("Buscar")}</button>
          <button type="button" disabled={busy || loading} onClick={() => setVersion((previous) => previous + 1)}>{t("Actualizar")}</button>
        </form>
        {error ? <p className="error" role="alert">{t(error)}</p> : null}
        {success ? <p className="success" role="status">{t("Permisos de {email} actualizados.", { email: success })}</p> : null}
        {loading ? <p role="status">{t("Cargando...")}</p> : !error ? (
          <>
            <p>{total} {tab === "users" ? t("cuentas") : t("intentos")}{t(" encontrados.")}</p>
            {!total ? <p>{t("No hay resultados para estos filtros.")}</p> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr>{(tab === "users"
                    ? ["Email", "Rol actual", "Estado", "Creación", "Gestionar acceso"]
                    : ["Fecha y hora", "Email ingresado", "Resultado", "Origen", "Cuenta identificada"]
                  ).map((heading) => <th key={heading} scope="col">{t(heading)}</th>)}</tr></thead>
                  <tbody>{tab === "users" ? accounts.items.map((account) => (
                    <tr key={account.id}>
                      <td>{account.email}</td><td>{t(ROLES[account.role] ?? account.role)}</td>
                      <td><span className={account.is_active ? styles.active : styles.inactive}>{account.is_active ? t("Activa") : t("Inactiva")}</span></td>
                      <td>{new Date(account.created_at).toLocaleString(language === "en" ? "en-US" : "es-UY")}</td>
                      <td><AccountControls key={`${account.id}-${account.role}-${account.is_active}`} account={account} busy={busy} save={save} /></td>
                    </tr>
                  )) : history.items.map((attempt) => (
                    <tr key={attempt.id}>
                      <td>{new Date(attempt.created_at).toLocaleString(language === "en" ? "en-US" : "es-UY")}</td>
                      <td>{attempt.email}</td><td><span className={attempt.succeeded ? styles.active : styles.inactive}>{attempt.succeeded ? t("Exitoso") : t("Fallido")}</span></td>
                      <td>{attempt.method === "token" ? "OAuth2 / Swagger" : t("Formulario de acceso")}</td>
                      <td>{attempt.user_id ?? t("Sin cuenta identificada")}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            <div className={styles.pagination}>
              <button disabled={offset === 0 || busy} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>{t("Anterior")}</button>
              <span>{t("Página ")}{Math.floor(offset / PAGE_SIZE) + 1}</span>
              <button disabled={offset + PAGE_SIZE >= total || busy} onClick={() => setOffset(offset + PAGE_SIZE)}>{t("Siguiente")}</button>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default function AdminPage() {
  const { t } = usePreferences();
  const { user, loading } = useAuth();
  if (loading) return <main className="container"><p role="status">{t("Verificando permisos...")}</p></main>;
  if (user?.role !== "superadmin") return (
    <main className="container"><h1>{t("Acceso restringido")}</h1><p role="alert">{t("Solo un superadmin puede acceder a esta sección.")}</p></main>
  );
  return <ManagementPanel />;
}
