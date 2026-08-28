"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, logout } = useAuth();

  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <>
      <nav className="navbar">
        <div className="navContent">
          <Link href="/" className="logo">
            TRACKFLOW
          </Link>

          <div className="navLinks">
            {isAuthenticated ? (
              <>
                <Link href="/">Inicio</Link>
                <Link href="/suppliers">Proveedores</Link>
                <Link href="/account/profile">Perfil</Link>
                <button type="button" className="navButton" onClick={logout}>
                  Cerrar sesion
                </button>
              </>
            ) : (
              !isAuthPage && <Link href="/login">Iniciar sesion</Link>
            )}
          </div>
        </div>
      </nav>

      <AuthGuard>{children}</AuthGuard>
    </>
  );
}
