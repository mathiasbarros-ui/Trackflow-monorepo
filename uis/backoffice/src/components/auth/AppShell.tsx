"use client";

import { usePreferences } from "@/hooks/usePreferences";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";

export default function AppShell({ children }: { children: ReactNode }) {
  const { t } = usePreferences();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();
  const isAdmin = isAuthenticated && ["admin", "superadmin"].includes(user?.role ?? "");

  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <>
      <nav className="navbar">
        <div className="navContent">
          <Link href="/" className="logo">
            TRACKFLOW
          </Link>

          <div className="navLinks">
            {isAdmin ? (
              <>
                <Link href="/">{t("Inicio")}</Link>
                <Link href="/incidents">{t("Incidencias")}</Link>
                <Link href="/suppliers">{t("Proveedores")}</Link>
                {/* <Link href="/knowledge">Conocimiento</Link> */}
                <Link href="/backoffice/inventory/orders">{t("Movimientos")}</Link>
                {user?.role === "superadmin" ? <Link href="/admin">{t("Usuarios y accesos")}</Link> : null}
                <Link href="/account/profile">{t("Perfil")}</Link>
                <button type="button" className="navButton" onClick={logout}>{t(" Cerrar sesión ")}</button>
              </>
            ) : (
              !isAuthPage && <Link href="/login">{t("Iniciar sesión")}</Link>
            )}
          </div>
        </div>
      </nav>

      <AuthGuard>{children}</AuthGuard>
    </>
  );
}
