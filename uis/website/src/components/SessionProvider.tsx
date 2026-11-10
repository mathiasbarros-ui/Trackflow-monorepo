"use client";

import { usePreferences } from "@/components/Preferences";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { transferSession } from "../../../shared/session";

export type Profile = { name?: string | null; phone?: string | null; address?: string | null };
export type User = { id: string; email: string; role: string; profile?: Profile | null };
type Session = {
  user: User | null;
  loading: boolean;
  error: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  request: (path: string, init?: RequestInit) => Promise<Response>;
  refresh: () => Promise<void>;
};
const Context = createContext<Session | null>(null);
const STORAGE_KEY = "access_token";

export async function responseError(response: Response, fallback: string) {
  const payload: unknown = await response.json();
  if (typeof payload === "object" && payload !== null && "detail" in payload) {
    const detail = payload.detail;
    if (typeof detail === "string") return detail;
    if (typeof detail === "object" && detail !== null && "message" in detail && typeof detail.message === "string") {
      return detail.message;
    }
    if (Array.isArray(detail)) return "Revisá los datos ingresados y la longitud de la contraseña.";
  }
  return fallback;
}

export default function SessionProvider({ children }: { children: ReactNode }) {
  const { t } = usePreferences();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = localStorage.getItem(STORAGE_KEY);
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`/backend${path}`, { ...init, headers, cache: "no-store" });
    if (response.status === 401) {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      throw new Error("Tu sesión venció. Iniciá sesión nuevamente.");
    }
    return response;
  }, []);

  const refresh = useCallback(async () => {
    const response = await request("/auth/me");
    if (!response.ok) throw new Error(await responseError(response, "No se pudo cargar tu perfil."));
    setUser(await response.json() as User);
  }, [request]);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const response = await fetch("/session", { cache: "no-store" });
        if (!response.ok) throw new Error("No se pudo recuperar la sesión.");
        const session: { token: string | null } = await response.json();
        if (session.token) localStorage.setItem(STORAGE_KEY, session.token);
        const token = localStorage.getItem(STORAGE_KEY);
        if (!token) return;
        const me = await fetch("/backend/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!me.ok) {
          if (me.status === 401) localStorage.removeItem(STORAGE_KEY);
          throw new Error("No se pudo recuperar tu perfil. Iniciá sesión nuevamente.");
        }
        if (active) setUser(await me.json() as User);
      } catch (failure) {
        console.error("Error al restaurar la sesión:", failure);
        if (active) setError(failure instanceof Error ? failure.message : "No se pudo recuperar la sesión.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void restore();
    return () => { active = false; };
  }, []);

  async function acceptSession(data: { access_token: string; user: User }) {
    setError("");
    if (["admin", "superadmin"].includes(data.user.role)) {
      transferSession(process.env.NEXT_PUBLIC_BACKOFFICE_URL ?? "http://localhost:3001", data.access_token);
      return;
    }
    localStorage.setItem(STORAGE_KEY, data.access_token);
    setUser(data.user);
    await refresh();
    router.replace("/");
  }

  async function signIn(email: string, password: string) {
    const response = await fetch("/backend/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error(await responseError(response, "No se pudo iniciar sesión."));
    await acceptSession(await response.json());
  }

  async function signUp(email: string, password: string, name: string) {
    const response = await fetch("/backend/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (!response.ok) throw new Error(await responseError(response, "No se pudo crear tu cuenta."));
    await acceptSession(await response.json());
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setError("");
    router.replace("/");
  }

  return (
    <Context.Provider value={{ user, loading, error, signIn, signUp, request, refresh }}>
      <header className="site-header">
        <div className="container header-content">
          <Link className="brand" href="/" aria-label={t("TrackFlow, inicio")}>
            <span className="brand-mark" aria-hidden="true">↗</span>track<span>flow</span><span className="brand-dot">.</span>
          </Link>
          <nav aria-label={t("Navegación principal")}>
            <Link href="/incidents/new">{t("Crear incidencia")}</Link>
            {loading ? <span className="muted" role="status">{t("Cargando...")}</span> : user ? (
              <>
                <Link className="profile-link" href="/profile"><span aria-hidden="true">◎</span>{t(" Mi perfil")}</Link>
                <button className="button button-outline small" onClick={logout}>{t("Cerrar sesión")}</button>
              </>
            ) : (
              <>
                <Link href="/login">{t("Iniciar sesión")}</Link>
                <Link className="button small" href="/register">{t("Crear cuenta ")}<span aria-hidden="true">↗</span></Link>
              </>
            )}
          </nav>
        </div>
      </header>
      {error ? <div className="container"><p className="notice error" role="alert">{t(error)}</p></div> : null}
      {children}
      <footer className="site-footer container">
        <div className="footer-grid">
          <div className="footer-about">
            <Link className="footer-brand" href="/">TRACKFLOW</Link>
            <p>{t("Gestión de almacenes y última milla para marcas de e-commerce. Del almacén a tu hogar, cuidando cada paso.")}</p>
          </div>
          <div>
            <h2 className="footer-heading">{t("Nuestras regiones")}</h2>
            <ul className="footer-list">
              <li>{t("Los Ángeles, Estados Unidos")}</li>
              <li>{t("Zaragoza, España")}</li>
              <li><Link href="/#nuestras-regiones">{t("Conocé nuestras ubicaciones ↗")}</Link></li>
            </ul>
          </div>
          <nav className="footer-nav" aria-label={t("Enlaces del pie de página")}>
            <h2 className="footer-heading">{t("Tu espacio TrackFlow")}</h2>
            <ul className="footer-list">
              <li><Link href="/incidents/new">{t("Reportar una incidencia")}</Link></li>
              <li><Link href="/profile">{t("Mi perfil")}</Link></li>
              <li><a href={process.env.NEXT_PUBLIC_BACKOFFICE_URL ?? "http://localhost:3001"}>{t("Acceso a administración ↗")}</a></li>
            </ul>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()}{t(" TrackFlow. Todos los derechos reservados.")}</p>
          <p>{t("Almacenamiento, coordinación logística y entrega final.")}</p>
        </div>
      </footer>
    </Context.Provider>
  );
}

export function useSession() {
  const session = useContext(Context);
  if (!session) throw new Error("useSession requiere SessionProvider.");
  return session;
}

export function RequireSession({ children }: { children: ReactNode }) {
  const { t } = usePreferences();
  const { user, loading } = useSession();
  if (loading) return <main className="container section"><p role="status">{t("Cargando tu sesión...")}</p></main>;
  if (!user) return (
    <main className="container section narrow">
      <p className="eyebrow">{t("TU ESPACIO TRACKFLOW")}</p>
      <h1>{t("Primero, iniciemos sesión.")}</h1>
      <p>{t("Para proteger tus datos y registrar tu solicitud, necesitas una cuenta.")}</p>
      <Link className="button" href="/login">{t("Iniciar sesión ↗")}</Link>
      <Link className="text-link" href="/register">{t("Crear una cuenta")}</Link>
    </main>
  );
  return children;
}
